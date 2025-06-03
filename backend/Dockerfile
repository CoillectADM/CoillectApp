# --- Build stage ---
FROM node:24-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Install all dependencies (including dev for compilation)
COPY package*.json .
RUN npm ci

# Copy source code
COPY . .

# Build the NestJS project
RUN npm run build

# Remove dev dependencies to slim down
RUN npm prune --omit=dev

# --- Production stage ---
FROM node:24-alpine

WORKDIR /usr/src/app

# Copy production node_modules and compiled sources
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
