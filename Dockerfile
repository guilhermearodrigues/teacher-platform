# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Declare build-time environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_OPENAI_API_KEY
ARG VITE_OPENAI_ORG_ID

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# List contents to verify build
RUN ls -la /app/dist/

# Production stage
FROM nginx:1.21-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verify files copied correctly
RUN ls -la /usr/share/nginx/html/

# Test nginx config
RUN nginx -t

# Expose port 80
EXPOSE 80

# Add health check that Coolify expects
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]