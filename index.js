// ── Stdout guard ─────────────────────────────────────────────────────────────
// MCP stdio transport requires stdout to carry ONLY JSON-RPC messages.
// Intercept every write and redirect non-JSON noise to stderr.
const _stdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, cb) => {
  const str = typeof chunk === 'string' ? chunk : chunk.toString();
  const trimmed = str.trim();
  if (trimmed === '' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return _stdoutWrite(chunk, encoding, cb);
  }
  process.stderr.write('[stdout-guard] ' + chunk, encoding, cb);
  return true;
};
console.log = (...args) => console.error(...args);
// ─────────────────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { UnifiClient } from './src/unifi-client.js';
import { TOOLS } from './src/tools.js';

const apiKey = process.env.UNIFI_API_KEY;
if (!apiKey) {
  console.error('Error: UNIFI_API_KEY is not set in the environment or .env file.');
  process.exit(1);
}

const client = new UnifiClient(apiKey);

const server = new Server(
  { name: 'unifi-mcp', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      // ── Sites ──────────────────────────────────────────────────────────────
      case 'list_sites':
        result = await client.listSites();
        break;
      case 'switch_site':
        result = await client.setActiveSite(args.site_id);
        break;

      // ── Network: Clients ───────────────────────────────────────────────────
      case 'list_clients':
        result = await client.listClients();
        break;
      case 'get_client':
        result = await client.getClient(args.query);
        break;
      case 'block_client':
        result = await client.blockClient(args.mac);
        break;
      case 'unblock_client':
        result = await client.unblockClient(args.mac);
        break;

      // ── Network: Devices ───────────────────────────────────────────────────
      case 'list_devices':
        result = await client.listDevices();
        break;
      case 'get_device_stats':
        result = await client.getDeviceStats(args.device_id);
        break;

      // ── Network: Networks ──────────────────────────────────────────────────
      case 'list_networks':
        result = await client.listNetworks();
        break;

      // ── Network: Stats ─────────────────────────────────────────────────────
      case 'get_site_stats':
        result = await client.getSiteStats();
        break;
      case 'get_uptime_stats':
        result = await client.getUptimeStats();
        break;

      // ── Network Detail (Site Manager proxy) ────────────────────────────────
      case 'get_detailed_clients':
        result = await client.getDetailedClients();
        break;
      case 'get_detailed_devices':
        result = await client.getDetailedDevices();
        break;
      case 'get_detailed_networks':
        result = await client.getDetailedNetworks();
        break;
      case 'get_site_health':
        result = await client.getSiteHealth();
        break;
      case 'get_site_events':
        result = await client.getSiteEvents({ limit: args.limit ?? 50 });
        break;

      // ── Access: Doors ──────────────────────────────────────────────────────
      case 'access_list_doors':
        result = await client.getAccessClient().listDoors();
        break;
      case 'access_unlock_door':
        result = await client.getAccessClient().unlockDoor(args.door_id);
        break;
      case 'access_set_door_lock_rule':
        result = await client.getAccessClient().setDoorLockRule(args.door_id, { lock_rule: args.rule });
        break;
      case 'access_set_emergency':
        result = await client.getAccessClient().setEmergency(args.type);
        break;
      case 'access_door_topology':
        result = await client.getAccessClient().getDoorGroupTopology();
        break;

      // ── Access: Users ──────────────────────────────────────────────────────
      case 'access_list_users':
        result = await client.getAccessClient().listUsers({
          page: args.page ?? 1,
          pageSize: args.page_size ?? 50,
        });
        break;
      case 'access_search_users':
        result = await client.getAccessClient().searchUsers(args.keyword);
        break;

      // ── Access: Visitors ───────────────────────────────────────────────────
      case 'access_list_visitors':
        result = await client.getAccessClient().listVisitors();
        break;
      case 'access_create_visitor':
        result = await client.getAccessClient().createVisitor({
          first_name: args.first_name,
          last_name: args.last_name,
          email: args.email,
          start_time: args.start_time,
          end_time: args.end_time,
        });
        break;
      case 'access_delete_visitor':
        result = await client.getAccessClient().deleteVisitor(args.visitor_id);
        break;

      // ── Access: Devices ────────────────────────────────────────────────────
      case 'access_list_devices':
        result = await client.getAccessClient().listAccessDevices();
        break;

      // ── Access: Logs ───────────────────────────────────────────────────────
      case 'access_get_logs':
        result = await client.getAccessClient().getSystemLogs({
          page: args.page ?? 1,
          pageSize: args.page_size ?? 50,
        });
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
