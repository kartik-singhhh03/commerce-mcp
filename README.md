# Commerce Operations Copilot

An AI-first commerce operations MCP server.

When an operations employee asks *"Why hasn't order #1234 shipped?"*, an AI client investigates by composing remote MCP tools. This repository is the **deterministic system of record** — not the reasoner.

---

## Problem

Fulfillment delays span multiple systems: OMS, payments, inventory, warehouses, and carriers. Today an engineer or senior ops analyst opens five dashboards, correlates IDs by hand, and writes a case.

That work is slow, inconsistent, and hard to scale. The question is operational — but the investigation is still engineering labor.

## Why engineers are currently involved

Each system has its own UI, auth, and vocabulary. There is no single API an agent can call safely. So humans glue the systems together in their heads.

## Why MCP

[Model Context Protocol](https://modelcontextprotocol.io) gives AI clients a standard way to discover and call tools.

This server exposes **facts**, not narratives:

- Payment captured or not
- Inventory reserved or pick-blocked
- Warehouse degraded or healthy
- Shipment created or not
- Operations case opened or listed

The **AI** decides which tools to call and how to explain the answer. The **server** never embeds investigation logic.

---

## Architecture

```text
AI Client (Cursor / Claude / Inspector)
        │
        │  Streamable HTTP  POST/GET /mcp
        ▼
┌───────────────────────────────────────┐
│  Transport (stateless createMcpHandler)│
│  GET /health                          │
└───────────────────┬───────────────────┘
                    ▼
┌───────────────────────────────────────┐
│  MCP Tools (thin AI interfaces)       │
└───────────────────┬───────────────────┘
                    ▼
┌───────────────────────────────────────┐
│  Services (all business rules)        │
└───────────────────┬───────────────────┘
                    ▼
┌───────────────────────────────────────┐
│  JSON Store (validated mock data)     │
└───────────────────────────────────────┘
```

**Stack:** Node 22 · TypeScript strict · Zod v4 · Official MCP SDK v2 · Vitest · Railway

---

## Workflow

1. Employee asks a natural-language question.
2. AI discovers tools via MCP `tools/list`.
3. AI calls tools (often in parallel after `get_order`).
4. AI synthesizes a root cause from structured facts.
5. AI opens an operations case with `create_operations_case`.
6. Later turns use `get_operations_case` / `list_open_operations_cases` for continuity.

---

## Example investigation

**Question:** Why hasn't order `#1234` shipped?

| Tool | Fact |
|------|------|
| `get_order` | Confirmed, warehouse `WH-EAST`, awaiting pick |
| `get_payment_status` | `captured` — not a payment hold |
| `get_inventory_status` | Reservations `pick_blocked` (zone equipment) |
| `get_warehouse_status` | `WH-EAST` **degraded**, active events |
| `get_shipment_status` | `not_created` |
| `create_operations_case` | `OPS-0001` opened with recommended action |
| `list_open_operations_cases` | Shows unresolved cases (optional `warehouseId`) |

The AI concludes: payment is fine; picking is blocked at a degraded warehouse; no shipment was created.

---

## MCP tool design

Tools are **AI interfaces**, not bare functions. Each description teaches *when* to use the tool, *what* it returns, and *what not* to use it for.

| Tool | Role |
|------|------|
| `get_order` | Canonical order — call first |
| `get_payment_status` | Payment / fraud blockers |
| `get_inventory_status` | Reservations & pick state |
| `get_warehouse_status` | Facility health & events |
| `get_shipment_status` | Lifecycle or `not_created` |
| `create_operations_case` | Escalate **after** investigation |
| `get_operations_case` | Fetch one case |
| `list_open_operations_cases` | Continuity — all open cases |

Every tool has `title`, teaching `description`, Zod `inputSchema` / `outputSchema`, annotations, and MCP-friendly errors (`isError`, no stack traces).

Verified with the **official MCP Inspector** (`tools/list`, `tools/call`, structured outputs, error paths).

---

## Deployment

Stateless Streamable HTTP. No database. No sticky sessions.

```bash
pnpm install && pnpm test && pnpm build
pnpm start                          # PORT from env
pnpm smoke                          # MCP_URL optional

docker build -t commerce-ops-mcp .
docker run --rm -p 3000:3000 -e PORT=3000 -e NODE_ENV=production commerce-ops-mcp

railway up                          # Dockerfile + railway.toml
curl https://<app>.up.railway.app/health
```

**Env:** `PORT` (Railway-injected) · `HOST` · `NODE_ENV` · `ALLOWED_HOSTS` · `RAILWAY_PUBLIC_DOMAIN` · `MCP_URL` (smoke only)

Cursor config:

```json
{ "mcpServers": { "commerce-ops": { "url": "https://<app>.up.railway.app/mcp" } } }
```

---

## Testing

```bash
pnpm test
```

Coverage includes schema contracts, store load for order `1234`, services (duplicate open cases, shipment `not_created`), in-process MCP tool calls, and HTTP `/health` + `/mcp`.

Inspector (local):

```bash
pnpm build && PORT=3000 HOST=127.0.0.1 node dist/index.js
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp --transport http --method tools/list
```

---

## Tradeoffs

| Choice | Why | Cost |
|--------|-----|------|
| JSON mock, no DB | Fast take-home, fail-fast Zod load | Cases reset on restart |
| Stateless MCP | Horizontal scale on Railway | No resumable sessions |
| No auth | Assignment constraint | Not production-secure as-is |
| Thin tools / fat services | Correct MCP philosophy | More files than a monolith |
| In-memory cases only | Demonstrates write path | Not durable across deploys |

---

## Future work

- Bearer / OAuth for remote MCP
- Persist cases (SQLite or managed DB)
- Close / update case tools
- Metrics on tool latency and error rates
- Multi-tenant warehouse partitions

---

## AI worklog summary

Architecture exploration separated AI reasoning from deterministic tools. Implementation used Cursor Agent with manual review of every generated surface. Streamable HTTP was validated against MCP SDK v2 (`createMcpHandler`), not deprecated transports. Tool descriptions and open-case listing were refined for discoverability and operational continuity.

See [`docs/AI_WORKLOG.md`](docs/AI_WORKLOG.md) for the full supervised log.
