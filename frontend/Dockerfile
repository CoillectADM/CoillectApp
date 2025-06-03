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

# Copy Vite build output to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration for SPA
COPY server.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
