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

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

RUN corepack enable

WORKDIR /app

COPY --chown=node:node --from=builder /app /app

EXPOSE 3001

USER node

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const auth=Buffer.from((process.env.DASHBOARD_BASIC_AUTH_USER||'')+':'+(process.env.DASHBOARD_BASIC_AUTH_PASS||'')).toString('base64'); fetch('http://127.0.0.1:'+(process.env.PORT||3001),{headers:{authorization:'Basic '+auth}}).then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "pnpm --filter @lore/dashboard exec next start -p ${PORT:-3001}"]
