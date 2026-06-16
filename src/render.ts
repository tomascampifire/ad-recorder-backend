import { createRenderJob, executeRenderJob } from '@hyperframes/producer';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export interface RenderInput {
  htmlContent: string;
  width: number;
  height: number;
  durationSeconds: number;
  fps: 24 | 30 | 60;
  quality: 'draft' | 'standard' | 'high';
}

export async function renderHtmlToMp4(input: RenderInput): Promise<Buffer> {
  const { htmlContent, width, height, durationSeconds, fps, quality } = input;

  const jobId = randomUUID();
  const workDir = join(tmpdir(), `render-${jobId}`);
  const inputDir = join(workDir, 'composition');
  const outputPath = join(workDir, 'output.mp4');

  await mkdir(inputDir, { recursive: true });

  const ensuredHtml = ensureCompositionWrapper(htmlContent, { width, height, durationSeconds });
  await writeFile(join(inputDir, 'index.html'), ensuredHtml, 'utf-8');

  try {
    // Resolver la ruta del chrome-headless-shell instalado por puppeteer en el build.
    // El glob en ENV no expande en Node, así que lo resolvemos en runtime.
    let executablePath: string | undefined;
    try {
      const { execSync } = await import('child_process');
      const found = execSync(
        'find /app/.cache/puppeteer -name "chrome-headless-shell" -type f 2>/dev/null | head -1'
      ).toString().trim();
      if (found) executablePath = found;
    } catch { /* fallback: el producer detecta el binario solo */ }

    const job = createRenderJob({
      fps,
      quality,
      format: 'mp4',
      workers: 1,
      useGpu: false,
      forceScreenshot: true,                // evita beginFrame (removido en Chrome 147+)
      executablePath,                        // chrome-headless-shell, no el Chrome del sistema
      browserArgs: [
        '--disable-dev-shm-usage',          // crítico: evita crashes por /dev/shm de 64MB en Docker
        '--no-sandbox',                      // requerido en contenedores sin privilegios
        '--disable-setuid-sandbox',
        '--disable-gpu',                     // ya estamos en software, esto lo hace explícito
        '--disable-accelerated-2d-canvas',
      ],
    });

    await executeRenderJob(job, inputDir, outputPath);

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function ensureCompositionWrapper(
  html: string,
  opts: { width: number; height: number; durationSeconds: number }
): string {
  if (html.includes('data-composition-id')) return html;

  const root = `<div id="hyperframes-root" data-composition-id="ad" data-start="0" data-width="${opts.width}" data-height="${opts.height}" style="width:${opts.width}px;height:${opts.height}px;position:relative;overflow:hidden;">`;
  const clip = `<div class="clip" data-start="0" data-duration="${opts.durationSeconds}" data-track-index="0" style="width:100%;height:100%;">`;

  let result = html.replace(/<body([^>]*)>/i, `<body$1>${root}${clip}`);
  result = result.replace(/<\/body>/i, `</div></div></body>`);
  return result;
}
