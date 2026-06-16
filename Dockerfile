# Use Bun — HyperFrames Producer is bundled for Bun and uses __dirname
# which doesn't exist in Node ESM scope
FROM oven/bun:1-debian

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
    libcups2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

COPY package*.json ./
RUN bun install \
  && node -e "const {install}=require('@puppeteer/browsers');install({browser:'chrome-headless-shell',buildId:'latest',cacheDir:'/app/.cache/puppeteer'}).then(r=>console.log('installed:',r.executablePath)).catch(e=>{console.error(e);process.exit(1)})" \
  && find /app/.cache/puppeteer -name 'chrome-headless-shell' -type f | head -1 > /app/.chrome-path \
  && echo "Binario: $(cat /app/.chrome-path)"

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
