# AI Worklog

Supervised AI usage for the Commerce Operations Copilot take-home.  
Goal: show deliberate model choice, verification, and rejection of weak designs — not “we used Cursor.”

---

## Planning

**Model:** GPT-5.5 (architecture dialogue)

**Purpose:** Explore AI-first commerce ops and MCP boundaries before writing code.

**Outcome:**

- Separated AI reasoning from deterministic MCP tools.
- Rejected a design that embedded “explain why order didn’t ship” inside the server.
- Settled on thin tools → services → JSON store, remote Streamable HTTP, no frontend / DB / auth.

**Verification:** Written architecture review before scaffolding; each tool justified by a real ops system.

---

## Implementation

**Model:** Cursor Agent (Composer)

**Purpose:** Generate TypeScript scaffolding, Zod schemas, store, services, tools, and transport.

**Outcome:**

- Phased delivery (scaffold → data → schemas/store → services → tools → transport → bootstrap).
- Official MCP SDK v2 packages (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`).
- Zod v4 as the single source of truth for entities and tool I/O.

**Verification:**

- Reviewed every generated file manually for layering leaks (no HTTP in services, no business logic in tools).
- Typecheck + ESLint + Vitest after each phase.

---

## Debugging

**Model:** Cursor Agent

**Purpose:** Resolve Streamable HTTP / Railway compatibility and SDK correctness.

**Outcome:**

- Used `createMcpHandler` + `toNodeHandler` (stateless), not deprecated per-session SSE wiring.
- Host/Origin allow-list for `/mcp`; `/health` left unguarded for platform probes.
- Bind `0.0.0.0` under Railway / production; listen on injected `PORT`.

**Verification:** Validated imports and APIs against current MCP TypeScript SDK v2 docs before implementation.

---

## Testing

**Model:** GPT-5.5 + Cursor Agent

**Purpose:** Review coverage for the demo scenario and failure modes.

**Outcome:**

- Added cases for duplicate open operations cases and shipment-`not_created`.
- In-process MCP client tests for tool discovery and structured content.
- HTTP transport tests for `/health`, 404/405, and live `/mcp`.
- Official **MCP Inspector** CLI: `tools/list`, `tools/call` (order, shipment, list cases), plus structured NotFound errors via protocol client.

**Verification:** `pnpm test`, `pnpm build`, `pnpm smoke`, Inspector against local `dist` server.

---

## Product refinement

**Model:** GPT-5.5

**Purpose:** Close the loop after “create case → done.”

**Outcome:**

- Added `list_open_operations_cases` (optional `warehouseId`) for traceability and continuity.
- Strengthened tool descriptions so an LLM can discover usage without custom prompts.

**Verification:** Inspector lists eight tools with titles, descriptions, and input/output schemas.

---

## Review

**Model:** GPT-5.5

**Purpose:** Senior engineering / AI-infrastructure review of the repository as a take-home.

**Outcome:**

- Confirmed reasoning stays outside the MCP server.
- Noted intentional limits (no auth, in-memory cases) as tradeoffs, not accidents.
- README rewritten for evaluators (problem → workflow → tools → deploy), not a technical dump.

---

## What AI did *not* decide alone

- Whether investigation logic belongs on the server (human: no).
- Whether to ship deprecated HTTP+SSE (human: no).
- Whether auth was in scope (human: explicitly out).
- Final tool naming and “when to use / when not” copy (human-directed, agent drafted).
