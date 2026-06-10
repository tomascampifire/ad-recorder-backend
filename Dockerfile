# Use Bun — HyperFrames Producer is bundled for Bun and uses __dirname
# which doesn't exist in Node ESM scope
FROM oven/bun:1-debian

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

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

COPY package*.json ./
RUN bun install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
