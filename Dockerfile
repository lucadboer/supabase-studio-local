FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update -qq && \
  apt-get install -y --no-install-recommends \
  git \
  python3 \
  ca-certificates \
  build-essential && \
  rm -rf /var/lib/apt/lists/* && \
  update-ca-certificates

RUN npm install -g pnpm@10.24.0

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile --ignore-scripts --prod=false 2>&1 | tail -20

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV STUDIO_PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

COPY apps/studio/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "--filter", "studio", "exec", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
