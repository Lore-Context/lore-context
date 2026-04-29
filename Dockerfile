FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-bookworm-slim AS runtime

LABEL io.modelcontextprotocol.server.name="io.github.lore-context/lore-context-mcp"
LABEL org.opencontainers.image.source="https://github.com/Lore-Context/lore-context"
LABEL org.opencontainers.image.description="Lore Context MCP stdio server"
LABEL org.opencontainers.image.licenses="Apache-2.0"

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV LORE_MCP_TRANSPORT=sdk

RUN corepack enable

WORKDIR /app

COPY --chown=node:node --from=builder /app /app

USER node

CMD ["node", "apps/mcp-server/dist/index.js"]
