# --- Build stage ---
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency files and install only prod deps
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build && npm prune --omit=dev

# --- Production stage ---
FROM node:24-alpine

WORKDIR /usr/src/app

# Copy wait-for-it script and make it executable
COPY wait-for-it.sh ./wait-for-it.sh
RUN chmod +x ./wait-for-it.sh

# Copy build output and dependencies
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production
EXPOSE 3000

# Wait for the PostgreSQL service before starting backend
ENTRYPOINT ["./wait-for-it.sh", "db:5432", "--", "node", "dist/main.js"]
