# --- Build stage ---
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Copiar arquivos de dependência e instalar
COPY package*.json ./
RUN npm ci

# Copiar o código fonte e construir
COPY . .
RUN npm run build && npm prune --omit=dev

# --- Production stage ---
FROM node:24-alpine

WORKDIR /usr/src/app

# Copiar o build e dependências
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Funciona igual no docker compose e na cloud (Render, Railway, Azure, Fly...):
# - a porta vem de PORT (a plataforma pode sobrescrever);
# - o banco vem de DATABASE_URL ou DATABASE_HOST/PORT/USER/PASSWORD/NAME;
# - se o banco ainda estiver subindo, a API tenta reconectar por ~30 s.
CMD ["node", "dist/main.js"]
