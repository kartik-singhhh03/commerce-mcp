# Dockerfile for Railway (and any container) deployment of the MCP server.
# TODO: Multi-stage build — compile TypeScript in builder, run node dist/index.js in runtime.
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/data ./data
EXPOSE 3000
# TODO: Ensure process listens on process.env.PORT (Railway injects it).
CMD ["node", "dist/index.js"]
