export const TOOLS = [
  // ── Sites ──────────────────────────────────────────────────────────────────
  {
    name: 'list_sites',
    description: 'List all Unifi sites. Each site shows its name, gateway, ISP, device/client counts, and whether an Access API token is configured.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'switch_site',
    description: 'Set the active site for all subsequent operations. Pass the siteId from list_sites. Returns the site name and whether Access is configured.',
    inputSchema: {
      type: 'object',
      properties: {
        site_id: { type: 'string', description: 'Site ID to activate' },
      },
      required: ['site_id'],
    },
  },

  // ── Network: Clients ───────────────────────────────────────────────────────
  {
    name: 'list_clients',
    description: 'List all connected network clients on the active site.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_client',
    description: 'Look up a network client by MAC address, IP address, or name.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'MAC address, IP, or partial client name' },
      },
      required: ['query'],
    },
  },
  {
    name: 'block_client',
    description: 'Block a network client by MAC address.',
    inputSchema: {
      type: 'object',
      properties: {
        mac: { type: 'string', description: 'Client MAC address (e.g. aa:bb:cc:dd:ee:ff)' },
      },
      required: ['mac'],
    },
  },
  {
    name: 'unblock_client',
    description: 'Unblock a previously blocked network client by MAC address.',
    inputSchema: {
      type: 'object',
      properties: {
        mac: { type: 'string', description: 'Client MAC address' },
      },
      required: ['mac'],
    },
  },

  // ── Network: Devices ───────────────────────────────────────────────────────
  {
    name: 'list_devices',
    description: 'List all Unifi network devices (APs, switches, gateways) on the active site.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_device_stats',
    description: 'Get detailed stats for a specific Unifi network device.',
    inputSchema: {
      type: 'object',
      properties: {
        device_id: { type: 'string', description: 'Device ID from list_devices' },
      },
      required: ['device_id'],
    },
  },

  // ── Network: Networks ──────────────────────────────────────────────────────
  {
    name: 'list_networks',
    description: 'List all networks and VLANs on the active site.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },

  // ── Network: Stats ─────────────────────────────────────────────────────────
  {
    name: 'get_site_stats',
    description: 'Get site-wide traffic statistics for the active site.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_uptime_stats',
    description: 'Get uptime data for the active site.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },

  // ── Network Detail (via Site Manager proxy) ───────────────────────────────
  {
    name: 'get_detailed_clients',
    description: 'Get full detail for every connected client on the active site — IP, MAC, hostname, VLAN, signal strength, traffic stats, AP name, and more.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_detailed_devices',
    description: 'Get full detail for every Unifi device on the active site — model, firmware, uptime, CPU/memory, port status, radio stats.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_detailed_networks',
    description: 'Get full network/VLAN configuration for the active site — subnets, DHCP settings, VLAN IDs, purpose.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_site_health',
    description: 'Get a health summary for the active site — WAN status, gateway, VPN tunnels, connected device counts.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_site_events',
    description: 'Get recent network events for the active site (last 7 days by default).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of events to return (default 50)' },
      },
      required: [],
    },
  },

  // ── Access: Doors ──────────────────────────────────────────────────────────
  {
    name: 'access_list_doors',
    description: 'List all physical doors/locks on the active site (requires Access token).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'access_unlock_door',
    description: 'Remotely unlock a door by its ID (requires Access token). Use access_list_doors to get door IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        door_id: { type: 'string', description: 'Door ID from access_list_doors' },
      },
      required: ['door_id'],
    },
  },
  {
    name: 'access_set_door_lock_rule',
    description: 'Set a temporary lock or unlock rule on a door (requires Access token).',
    inputSchema: {
      type: 'object',
      properties: {
        door_id: { type: 'string', description: 'Door ID' },
        rule: {
          type: 'string',
          enum: ['lock', 'unlock', 'auto'],
          description: '"lock" = always locked, "unlock" = always unlocked, "auto" = follow schedule',
        },
      },
      required: ['door_id', 'rule'],
    },
  },
  {
    name: 'access_set_emergency',
    description: 'Trigger a site-wide emergency status on all doors (requires Access token). Use with care.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['lockdown', 'unlock', 'clear'],
          description: '"lockdown" = lock all doors, "unlock" = unlock all, "clear" = return to normal',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'access_door_topology',
    description: 'Get the full door group topology / layout for the active site (requires Access token).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },

  // ── Access: Users ──────────────────────────────────────────────────────────
  {
    name: 'access_list_users',
    description: 'List all Access users on the active site (requires Access token).',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default 1)' },
        page_size: { type: 'number', description: 'Results per page (default 50)' },
      },
      required: [],
    },
  },
  {
    name: 'access_search_users',
    description: 'Search Access users by name or keyword (requires Access token).',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Name or partial name to search for' },
      },
      required: ['keyword'],
    },
  },

  // ── Access: Visitors ───────────────────────────────────────────────────────
  {
    name: 'access_list_visitors',
    description: 'List all current visitors on the active site (requires Access token).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'access_create_visitor',
    description: 'Create a visitor with time-limited door access (requires Access token).',
    inputSchema: {
      type: 'object',
      properties: {
        first_name: { type: 'string', description: 'Visitor first name' },
        last_name: { type: 'string', description: 'Visitor last name' },
        email: { type: 'string', description: 'Visitor email address' },
        start_time: {
          type: 'number',
          description: 'Access start time as Unix timestamp in milliseconds',
        },
        end_time: {
          type: 'number',
          description: 'Access end time as Unix timestamp in milliseconds',
        },
      },
      required: ['first_name', 'last_name', 'start_time', 'end_time'],
    },
  },
  {
    name: 'access_delete_visitor',
    description: 'Revoke a visitor\'s access and delete their record (requires Access token).',
    inputSchema: {
      type: 'object',
      properties: {
        visitor_id: { type: 'string', description: 'Visitor ID from access_list_visitors' },
      },
      required: ['visitor_id'],
    },
  },

  // ── Access: Devices ────────────────────────────────────────────────────────
  {
    name: 'access_list_devices',
    description: 'List all Unifi Access readers and controllers on the active site (requires Access token).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },

  // ── Access: Logs ───────────────────────────────────────────────────────────
  {
    name: 'access_get_logs',
    description: 'Fetch the Access system log — who opened which door and when (requires Access token).',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default 1)' },
        page_size: { type: 'number', description: 'Results per page (default 50)' },
      },
      required: [],
    },
  },
];
