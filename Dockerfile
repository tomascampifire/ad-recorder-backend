# Pin to linux/amd64 — matches Railway's servers and ensures correct Chrome binary
FROM --platform=linux/amd64 node:22-bookworm-slim

# Install system libraries that Chrome needs
RUN apt-get update && apt-get install -y --no-install-recommends \
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

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Let Puppeteer download chrome-headless-shell (what HyperFrames actually needs)
RUN npx puppeteer browsers install chrome-headless-shell

# Copy source (no build step — tsx runs TypeScript directly)
COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
