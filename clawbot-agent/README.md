# ClawBot Agent v2.0

Full-scope connection system for SISG platform.

## Connection Priority

```
1. WebSocket  (wss://sentinelintegratedgroup.com/api/clawbot/ws)
   └─ Persistent, real-time, outbound (no NAT issues)
   └─ Auto-reconnects with exponential backoff
   └─ 25s keepalive pings

2. SSE Stream  (https://sentinelintegratedgroup.com/api/clawbot/stream)
   └─ EventSource fallback when WS is reconnecting
   └─ Server-sent events, one-way push from platform
   └─ Auto-reconnects on drop

3. HTTP Poll  (https://sentinelintegratedgroup.com/api/clawbot/poll)
   └─ Every 10s pull when both WS and SSE are unavailable
   └─ Always works regardless of network conditions

4. Slack      (via platform webhook fallback)
   └─ Used by platform when no direct/polling connection active

5. Direct API handshake (optional, if port 4000 is publicly reachable)
   └─ Platform calls /api/ping to verify connectivity
   └─ Provides platform → ClawBot push
   └─ Skipped automatically if behind NAT
```

## Local HTTP Server (port 4000)

Always runs for direct API use when port is reachable:

```
GET  /api/ping      — public, no auth (used for handshake verification)
GET  /api/status    — system info, uptime, connection mode
GET  /api/agents    — agent list and status
POST /api/agents/:id — update agent
POST /api/tasks     — execute a task
POST /api/commands  — execute a command
GET  /api/logs      — last 100 log lines
```

All endpoints (except /api/ping) require `X-API-Key: clawbot-sisg-2026` header.

## Commands

| Command | Args | Description |
|---|---|---|
| `ping` | — | Returns `{ pong: true }` |
| `uptime` | — | Agent uptime |
| `system-info` | — | CPU / memory / disk |
| `health-check` | — | Pings platform /api/health |
| `deploy-status` | `path` | git log + branch + dirty check |
| `git-pull` | `path` | git pull --rebase |
| `docker-status` | — | docker ps |
| `docker-logs` | `container`, `lines` | docker logs |
| `docker-restart` | `container` | docker restart |
| `run-qa` | — | Trigger QA agent |
| `run-all-agents` | — | Run all agents |
| `list-agents` | — | List agent registry |
| `agent-status` | `agentId` | Single agent status |
| `openclaw-status` | — | openclaw status |
| `openclaw-restart` | — | openclaw gateway restart |
| `shell` | `cmd` | Allowlisted shell commands |
| `agent:run:<id>` | — | Trigger specific agent |
| `agent:update:<id>` | any | Update agent fields |

## Setup

```bash
cd clawbot-agent
npm install
# or: pnpm install

# Configure (optional — defaults work out of box):
export SISG_URL=https://sentinelintegratedgroup.com
export CLAWBOT_API_KEY=clawbot-sisg-2026
export AGENT_PORT=4000

node agent.js
```

## Run as Service (systemd)

```ini
[Unit]
Description=ClawBot Agent
After=network.target

[Service]
Type=simple
User=brian121
WorkingDirectory=/home/brian121/.openclaw/workspace/sisg/clawbot-agent
ExecStart=/usr/bin/node agent.js
Restart=always
RestartSec=10
Environment=SISG_URL=https://sentinelintegratedgroup.com
Environment=CLAWBOT_API_KEY=clawbot-sisg-2026

[Install]
WantedBy=multi-user.target
```
