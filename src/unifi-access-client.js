import fetch from 'node-fetch';
import https from 'https';

// UDM Pro uses a self-signed cert on port 12445 — bypass verification
const INSECURE_AGENT = new https.Agent({ rejectUnauthorized: false });

export class UnifiAccessClient {
  constructor(hostId, token) {
    // hostId may be a plain UUID or a MAC-based string like
    // "AABBCC112233....:1234567890" — strip the colon suffix and lowercase
    const cleanId = hostId.split(':')[0].toLowerCase();
    this.baseUrl = `https://${cleanId}.ui.direct:12445`;
    this.token = token;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}/api/v1/developer${path}`;
    const res = await fetch(url, {
      ...options,
      agent: INSECURE_AGENT,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Unifi Access API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  // ── Doors ─────────────────────────────────────────────────────────────────

  async listDoors() {
    const data = await this.request('/doors');
    return data.data ?? data;
  }

  async getDoor(id) {
    const data = await this.request(`/doors/${encodeURIComponent(id)}`);
    return data.data ?? data;
  }

  async unlockDoor(id) {
    return this.request(`/doors/${encodeURIComponent(id)}/unlock`, { method: 'PUT' });
  }

  async setDoorLockRule(id, rule) {
    return this.request(`/doors/${encodeURIComponent(id)}/lock_rule`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async setEmergency(type) {
    // type: "lockdown" | "unlock" | "clear"
    return this.request('/doors/settings/emergency', {
      method: 'PUT',
      body: JSON.stringify({ emergency_type: type }),
    });
  }

  async getDoorGroups() {
    const data = await this.request('/door_groups');
    return data.data ?? data;
  }

  async getDoorGroupTopology() {
    const data = await this.request('/door_groups/topology');
    return data.data ?? data;
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async listUsers({ page = 1, pageSize = 50 } = {}) {
    const data = await this.request(
      `/users?page_num=${page}&page_size=${pageSize}&expand[]=access_policy`
    );
    return data.data ?? data;
  }

  async searchUsers(keyword) {
    const data = await this.request(
      `/users/search?keyword=${encodeURIComponent(keyword)}&page_size=25&page_num=1`
    );
    return data.data ?? data;
  }

  // ── Visitors ──────────────────────────────────────────────────────────────

  async listVisitors({ page = 1, pageSize = 50 } = {}) {
    const data = await this.request(`/visitors?page_num=${page}&page_size=${pageSize}`);
    return data.data ?? data;
  }

  async createVisitor(visitor) {
    // visitor: { first_name, last_name, email, start_time (epoch ms), end_time (epoch ms) }
    return this.request('/visitors', {
      method: 'POST',
      body: JSON.stringify(visitor),
    });
  }

  async deleteVisitor(id) {
    return this.request(`/visitors/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ── Devices (access readers/controllers) ─────────────────────────────────

  async listAccessDevices() {
    const data = await this.request('/devices');
    return data.data ?? data;
  }

  // ── System Logs ───────────────────────────────────────────────────────────

  async getSystemLogs({ page = 1, pageSize = 50 } = {}) {
    const data = await this.request(`/system/logs?page_num=${page}&page_size=${pageSize}`);
    return data.data ?? data;
  }
}
