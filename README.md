# Commerce Operations Copilot — MCP Server

Remotely hosted **Model Context Protocol** server that exposes deterministic commerce operations data for an AI copilot.

The AI investigates questions like *"Why hasn't order #1234 shipped?"* by composing MCP tools. This server never reasons — it only returns operational facts.

## Stack

- Node.js 22, TypeScript (strict), pnpm
- Official MCP TypeScript SDK v2 (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`)
- Stateless Streamable HTTP via `createMcpHandler`
- Zod v4 validation, Vitest, Railway

## Status

Scaffold + mock data only. Business logic is intentionally unimplemented (see `TODO` comments in `src/`).

## Local development

```bash
pnpm install
pnpm dev
```

Health: `GET /health`  
MCP: `POST /mcp` (Streamable HTTP)

## Deploy

Push to Railway with the included `Dockerfile` and `railway.toml`.

## License

Private take-home assignment.
