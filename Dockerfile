FROM --platform=linux/amd64 node:22-bookworm-slim

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

COPY package*.json ./
RUN npm install

# Install chrome-headless-shell
RUN npx puppeteer browsers install chrome-headless-shell

# Create a launcher script at a fixed path that injects required Docker flags.
# Puppeteer will use this via PUPPETEER_EXECUTABLE_PATH instead of the raw binary.
RUN CHROME_BIN=$(find /root/.cache/puppeteer -name 'chrome-headless-shell' -type f | head -1) \
    && echo "Chrome binary found at: $CHROME_BIN" \
    && cat > /usr/local/bin/chrome-launcher << SCRIPT
#!/bin/sh
exec "$CHROME_BIN" --no-sandbox --disable-dev-shm-usage "\$@"
SCRIPT \
    && chmod +x /usr/local/bin/chrome-launcher \
    && echo "Launcher contents:" \
    && cat /usr/local/bin/chrome-launcher

# Point Puppeteer to our launcher so the flags are always included
ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chrome-launcher

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
