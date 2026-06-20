FROM node:22-alpine AS deps
WORKDIR /app
# Install ajv@8.12.0 at root first (required by Fastify's schema compiler)
COPY package*.json ./
RUN npm install ajv@8.12.0 --legacy-peer-deps --save 2>/dev/null || true
COPY apps/api/package*.json ./apps/api/
RUN npm ci --workspace=apps/api --legacy-peer-deps

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy everything needed
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/package*.json ./apps/api/
COPY package*.json ./

# tsx ships with the api devDependencies — use it directly
ENV PATH="/app/apps/api/node_modules/.bin:$PATH"

WORKDIR /app/apps/api
EXPOSE 3001

COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
