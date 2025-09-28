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
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

# Create log directory
RUN mkdir -p /var/log/nginx

# Debug: List files to verify they exist
RUN ls -la /usr/share/nginx/html/
RUN nginx -t

# Expose port 80
EXPOSE 80

# Add health check with more reasonable timing
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]