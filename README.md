# OuiFi Unifi MCP

A local MCP (Model Context Protocol) server that gives Claude full visibility and control over your Unifi infrastructure — network clients, devices, VLANs, site health, events, and physical access control (doors, visitors, NFC cards).

Built on the [Unifi Cloud API](https://api.ui.com) and the Unifi Site Manager proxy, which means **no local network access required** — it works remotely for all your sites with a single API key.

---

## What it can do

### Network (all sites, no extra setup)
- List all your Unifi sites with status, ISP, device and client counts
- Get full client detail — IP, MAC, hostname, VLAN, signal, traffic, which AP
- Get full device detail — model, firmware, uptime, CPU/memory, port status
- List networks and VLANs with full configuration
- Site health summary — WAN, gateway, VPN tunnels
- Recent network events

### Unifi Access (per site, requires Access token)
- List doors and their status
- Remotely unlock a door
- Set temporary lock/unlock rules
- Trigger emergency lockdown or unlock
- List, create, and revoke visitors with time-limited access
- View access logs — who opened which door and when
- List Access users and search by name
- List NFC readers and controllers

---

## Prerequisites

- Node.js 18+
- A Unifi Cloud API key — generate at **unifi.ui.com → Settings → API Keys**
- (Optional) Unifi Access API tokens for sites with door control — generate in **Access → Settings → General → Advanced → API Token**

---

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create your `.env` file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your cloud API key:
   ```
   UNIFI_API_KEY=your_api_key_here
   ```

3. **Add Access tokens** (optional, per site)

   Run `list_sites` in Claude — each site shows a `slug` field. Use that to name the token variable:
   ```
   UNIFI_ACCESS_TOKEN_MAIN_OFFICE=your_access_token_here
   ```

---

## Connect to Claude Desktop

Add this to your `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "unifi": {
      "command": "/usr/local/bin/node",
      "args": ["/path/to/OuiFiUnifiMCP/index.js"]
    }
  }
}
```

Replace `/path/to/OuiFiUnifiMCP` with the actual path where you cloned this repo.
Restart Claude Desktop after saving.

---

## How it works

### No local access needed
The server uses two Unifi API surfaces:

| Surface | URL | Used for |
|---|---|---|
| Unifi Cloud API | `api.ui.com/v1/` | Site list, overview stats |
| Site Manager Proxy | `api.ui.com/v1/connector/consoles/{hostId}/network/` | Full client/device/network detail |
| Unifi Access API | `{hostId}.ui.direct:12445` | Door control, visitors, access logs |

All three accept the same `X-API-KEY` header (except Access, which uses its own Bearer token). The Site Manager proxy routes requests through Unifi's cloud to reach your local controllers — no VPN or static IP needed.

### Site Manager Proxy
This is the key insight: Unifi's cloud acts as a transparent relay to the full local Network API (`/api/s/{site}/stat/sta`, etc.), exposing all 200+ endpoints remotely with just your cloud API key. This gives you the same data depth as if you were on the local network.

---

## Available tools

### Sites
| Tool | Description |
|---|---|
| `list_sites` | List all sites with status, ISP, gateway, counts, and Access token status |
| `switch_site` | Set the active site for subsequent calls |

### Network detail
| Tool | Description |
|---|---|
| `get_detailed_clients` | All connected clients with full detail |
| `get_detailed_devices` | All network devices with full stats |
| `get_detailed_networks` | Full VLAN/network configuration |
| `get_site_health` | WAN, gateway, and VPN health summary |
| `get_site_events` | Recent network events |

### Clients
| Tool | Description |
|---|---|
| `list_clients` | Connected clients (cloud summary) |
| `get_client` | Look up by MAC, IP, or name |
| `block_client` | Block a client by MAC |
| `unblock_client` | Unblock a client by MAC |

### Devices
| Tool | Description |
|---|---|
| `list_devices` | Network devices (cloud summary) |
| `get_device_stats` | Stats for a specific device |

### Networks & Stats
| Tool | Description |
|---|---|
| `list_networks` | Networks and VLANs (cloud summary) |
| `get_site_stats` | Site-wide traffic stats |
| `get_uptime_stats` | Uptime data |

### Unifi Access — Doors
| Tool | Description |
|---|---|
| `access_list_doors` | List all doors |
| `access_unlock_door` | Remotely unlock a door |
| `access_set_door_lock_rule` | Set temporary lock/unlock rule |
| `access_set_emergency` | Emergency lockdown / unlock all doors |
| `access_door_topology` | Full door group layout |

### Unifi Access — Users & Visitors
| Tool | Description |
|---|---|
| `access_list_users` | List Access users |
| `access_search_users` | Search users by name |
| `access_list_visitors` | List current visitors |
| `access_create_visitor` | Create visitor with time-limited access |
| `access_delete_visitor` | Revoke visitor access |

### Unifi Access — Devices & Logs
| Tool | Description |
|---|---|
| `access_list_devices` | List Access readers and controllers |
| `access_get_logs` | Access log — who opened what and when |

---

## Project structure

```
.
├── index.js                    # MCP server entry point
├── src/
│   ├── unifi-client.js         # Unifi Cloud + Site Manager proxy client
│   ├── unifi-access-client.js  # Unifi Access API client
│   └── tools.js                # MCP tool definitions
├── .env.example
├── .gitignore
└── package.json
```

---

## Acknowledgements

- [Art-of-WiFi/UniFi-API-client](https://github.com/Art-of-WiFi/UniFi-API-client) — invaluable reference for the Site Manager proxy URL structure
- [Unifi Developer Portal](https://developer.ui.com)
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
