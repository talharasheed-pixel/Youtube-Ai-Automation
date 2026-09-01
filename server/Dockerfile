FROM node:20-alpine

# Install build tools, ffmpeg, curl for healthchecks
RUN apk add --no-cache ffmpeg curl python3 make g++

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Create required media & data directories
RUN mkdir -p /app/data /app/media/audio /app/media/images /app/media/video /app/media/thumbnails /app/media/renders

EXPOSE 3001

CMD ["node", "server.js"]
