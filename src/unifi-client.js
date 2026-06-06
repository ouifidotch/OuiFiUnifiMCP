import fetch from 'node-fetch';
import { UnifiAccessClient } from './unifi-access-client.js';

const BASE_URL = 'https://api.ui.com';

/** Convert a site name to an env-var-safe slug.
 *  "Main Office"            → "MAIN_OFFICE"
 *  "Warehouse - Building 2" → "WAREHOUSE_BUILDING_2"
 */
function nameToSlug(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export class UnifiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.activeSiteId = null;
    this.activeSiteName = null;
    this.activeHostId = null;
    this._sitesCache = null;
  }

  async request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Unifi API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  // ── Hosts ────────────────────────────────────────────────────────────────

  async listHosts() {
    const data = await this.request('/v1/hosts');
    return data.data ?? data;
  }

  // ── Sites ────────────────────────────────────────────────────────────────

  async listSites() {
    // Hosts endpoint is optional — if it fails, we fall back to site meta names
    const [sitesData, hostsResult] = await Promise.all([
      this.request('/v1/sites'),
      this.request('/v1/hosts').catch(() => ({ data: [] })),
    ]);

    const sites = sitesData.data ?? sitesData;
    const hosts = hostsResult.data ?? hostsResult ?? [];
    const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));

    const enriched = sites.map((site) => {
      const host = hostMap[site.hostId] ?? {};
      const name = host.reportedState?.name ?? host.name ?? site.meta?.desc ?? 'Default';
      const slug = nameToSlug(name);
      const hasAccessToken = !!process.env[`UNIFI_ACCESS_TOKEN_${slug}`];

      return {
        siteId: site.siteId,
        name,
        slug,
        hostId: site.hostId,
        gateway: site.statistics?.gateway?.shortname ?? null,
        isp: site.statistics?.ispInfo?.name ?? null,
        timezone: site.meta?.timezone ?? null,
        devices: site.statistics?.counts?.totalDevice ?? null,
        clients:
          (site.statistics?.counts?.wifiClient ?? 0) +
          (site.statistics?.counts?.wiredClient ?? 0),
        wanUptime: site.statistics?.percentages?.wanUptime ?? null,
        permission: site.permission,
        accessConfigured: hasAccessToken,
      };
    });

    // Cache for use by setActiveSite
    this._sitesCache = enriched;
    return enriched;
  }

  async setActiveSite(siteId) {
    // Populate cache if needed
    if (!this._sitesCache) await this.listSites();

    const site = this._sitesCache.find((s) => s.siteId === siteId);
    this.activeSiteId = siteId;
    this.activeSiteName = site?.name ?? siteId;
    this.activeHostId = site?.hostId ?? null;

    const slug = nameToSlug(this.activeSiteName);
    const hasToken = !!process.env[`UNIFI_ACCESS_TOKEN_${slug}`];

    return {
      siteId,
      name: this.activeSiteName,
      accessConfigured: hasToken,
      accessTokenEnvVar: `UNIFI_ACCESS_TOKEN_${slug}`,
    };
  }

  /** Returns a UnifiAccessClient for the active site.
   *  Looks up token via  UNIFI_ACCESS_TOKEN_<NAME_SLUG>  in the environment.
   */
  getAccessClient() {
    if (!this.activeSiteId) throw new Error('No active site. Call switch_site first.');
    if (!this.activeHostId) throw new Error('No hostId for active site.');

    const slug = nameToSlug(this.activeSiteName);
    const token = process.env[`UNIFI_ACCESS_TOKEN_${slug}`];

    if (!token) {
      throw new Error(
        `No Access token found for "${this.activeSiteName}". ` +
        `Add  UNIFI_ACCESS_TOKEN_${slug}=<token>  to your .env file.\n` +
        `Generate the token in: Access → Settings → General → Advanced → API Token.`
      );
    }

    return new UnifiAccessClient(this.activeHostId, token);
  }

  #sitePrefix() {
    if (!this.activeSiteId) throw new Error('No active site set. Call switch_site first.');
    return `/v1/sites/${this.activeSiteId}`;
  }

  // ── Clients ──────────────────────────────────────────────────────────────

  async listClients() {
    const data = await this.request(`${this.#sitePrefix()}/clients`);
    return data.data ?? data;
  }

  async getClient(query) {
    const clients = await this.listClients();
    const q = query.toLowerCase();
    const match = clients.find(
      (c) =>
        c.mac?.toLowerCase() === q ||
        c.ip === q ||
        c.name?.toLowerCase().includes(q)
    );
    if (!match) throw new Error(`No client found matching: ${query}`);
    return match;
  }

  async blockClient(mac) {
    return this.request(
      `${this.#sitePrefix()}/clients/${encodeURIComponent(mac)}/block`,
      { method: 'POST' }
    );
  }

  async unblockClient(mac) {
    return this.request(
      `${this.#sitePrefix()}/clients/${encodeURIComponent(mac)}/unblock`,
      { method: 'POST' }
    );
  }

  // ── Devices ──────────────────────────────────────────────────────────────

  async listDevices() {
    const data = await this.request(`${this.#sitePrefix()}/devices`);
    return data.data ?? data;
  }

  async getDeviceStats(deviceId) {
    const data = await this.request(
      `${this.#sitePrefix()}/devices/${encodeURIComponent(deviceId)}/stats`
    );
    return data.data ?? data;
  }

  // ── Networks ─────────────────────────────────────────────────────────────

  async listNetworks() {
    const data = await this.request(`${this.#sitePrefix()}/networks`);
    return data.data ?? data;
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  async getSiteStats() {
    const data = await this.request(`${this.#sitePrefix()}/stats`);
    return data.data ?? data;
  }

  async getUptimeStats() {
    const data = await this.request(`${this.#sitePrefix()}/uptime`);
    return data.data ?? data;
  }

  // ── Site Manager Proxy (full network detail via api.ui.com) ──────────────
  // Uses the same API key — no extra credentials needed.
  // URL pattern: api.ui.com/v1/connector/consoles/{hostId}/network/api/s/default/{path}

  async #proxyRequest(path, options = {}) {
    if (!this.activeHostId) throw new Error('No active site. Call switch_site first.');
    const url = `${BASE_URL}/v1/connector/consoles/${this.activeHostId}/network/api/s/default${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Proxy API error ${res.status}: ${text}`);
    }
    const json = await res.json();
    if (json?.meta?.rc !== 'ok') throw new Error(`Proxy error: ${JSON.stringify(json?.meta)}`);
    return json.data;
  }

  async getDetailedClients() {
    return this.#proxyRequest('/stat/sta');
  }

  async getDetailedDevices() {
    return this.#proxyRequest('/stat/device');
  }

  async getDetailedNetworks() {
    return this.#proxyRequest('/rest/networkconf');
  }

  async getSiteHealth() {
    return this.#proxyRequest('/stat/health');
  }

  async getSiteEvents({ limit = 50 } = {}) {
    return this.#proxyRequest(`/stat/event?_limit=${limit}&within=168`);
  }
}
