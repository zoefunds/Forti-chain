FROM node:22-alpine AS deps
WORKDIR /app

# Copy api package files and install
COPY apps/api/package.json ./
# Generate a fresh lockfile (don't use ci — root lockfile doesn't have workspace entries)
RUN npm install --legacy-peer-deps

# Ensure ajv@8.12.0 is present (Fastify schema compiler requirement)
RUN npm install ajv@8.12.0 --legacy-peer-deps --save

# -----------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:$PATH"

COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./
COPY apps/api/package.json ./
COPY apps/api/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
