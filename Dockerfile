# Stage 1: obtener el chrome-headless-shell desde la imagen oficial
# (evita descargas en build time que fallan por URLs cambiantes)
FROM chromedp/headless-shell:stable AS chrome

# Stage 2: imagen principal con Bun
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
  && rm -rf /var/lib/apt/lists/*

# Copiar el binario desde el stage de chrome
COPY --from=chrome /headless-shell /usr/local/bin/chrome-headless-shell
RUN chmod +x /usr/local/bin/chrome-headless-shell

WORKDIR /app

# Apuntar puppeteer al binario copiado
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chrome-headless-shell
ENV CHROME_PATH=/usr/local/bin/chrome-headless-shell

COPY package*.json ./
RUN bun install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
