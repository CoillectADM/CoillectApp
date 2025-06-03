# --- Build stage ---
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json .
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# --- Production stage (Nginx) ---
FROM nginx:1.27-alpine

# Copy Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx conf for SPA
COPY server.nginx /etc/nginx/conf.d/default.conf

# Add wait-for-it script to wait for backend
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

EXPOSE 81

# Wait until backend:3000 is reachable, then start Nginx
ENTRYPOINT ["/wait-for-it.sh", "backend:3000", "--", "nginx", "-g", "daemon off;"]
