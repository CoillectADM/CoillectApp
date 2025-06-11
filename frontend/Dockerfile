# --- Build stage ---
FROM node:24-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package*.json .
RUN npm ci

# Copiar o código fonte e construir
COPY . .
RUN npm run build

# --- Production stage (Nginx) ---
FROM nginx:1.27-alpine

# Copiar o build do Vite para o nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração personalizada do Nginx para SPA
COPY server.nginx /etc/nginx/conf.d/default.conf

# Instalar bash (caso o shell padrão 'sh' não esteja funcionando)
RUN apk add --no-cache bash

# Adicionar o script wait-for-it.sh para aguardar o backend
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

EXPOSE 81

# Aguardar até o backend estar acessível, depois iniciar o Nginx
ENTRYPOINT ["/bin/bash", "/wait-for-it.sh", "backend:3000", "--", "nginx", "-g", "daemon off;"]
