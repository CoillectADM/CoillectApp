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

# Instalar bash (caso o shell padrão 'sh' não esteja funcionando)
RUN apk add --no-cache bash

# Copiar o script wait-for-it.sh e torná-lo executável
COPY wait-for-it.sh ./wait-for-it.sh
RUN chmod +x ./wait-for-it.sh

# Copiar o build e dependências
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production
EXPOSE 3000

# Aguardar o serviço PostgreSQL antes de iniciar o backend
ENTRYPOINT ["/bin/bash", "./wait-for-it.sh", "db:5432", "--", "node", "dist/main.js"]
