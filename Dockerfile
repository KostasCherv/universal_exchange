# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for development)
RUN npm ci

# Copy source code (excluding node_modules)
COPY src/ ./src/
COPY tsconfig.json ./
COPY .eslintrc.js ./
COPY .prettierrc ./

# Build the application
RUN npm run build

# Create data directory for SQLite database
RUN mkdir -p data

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"] 