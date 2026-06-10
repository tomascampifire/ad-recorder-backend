FROM node:22-bookworm-slim

# Install Chromium, ffmpeg, fonts, and all headless rendering dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-dejavu-core \
    fontconfig \
    ca-certificates \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer (used internally by HyperFrames Producer) to use the system
# Chromium instead of downloading its own copy
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

# Copy and install dependencies first (cached layer)
COPY package*.json ./
RUN npm install --omit=optional

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

EXPOSE 3000

CMD ["node", "dist/server.js"]
