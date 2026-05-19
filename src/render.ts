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

/**
 * Renders HTML content to MP4 using HyperFrames Producer.
 * Returns the MP4 file as a Buffer.
 */
export async function renderHtmlToMp4(input: RenderInput): Promise<Buffer> {
  const { htmlContent, width, height, durationSeconds, fps, quality } = input;

  const jobId = randomUUID();
  const workDir = join(tmpdir(), `render-${jobId}`);
  const inputDir = join(workDir, 'composition');
  const inputPath = join(inputDir, 'index.html');
  const outputPath = join(workDir, 'output.mp4');

  await mkdir(inputDir, { recursive: true });

  const ensuredHtml = ensureCompositionWrapper(htmlContent, {
    width,
    height,
    durationSeconds,
  });

  await writeFile(inputPath, ensuredHtml, 'utf-8');

  try {
    const job = createRenderJob(
      inputPath,
      outputPath,
      String(fps),
      quality,
      {
        format: 'mp4',
        workers: 1,
        useGpu: false,
      }
    );

    await executeRenderJob(job);

    const mp4 = await readFile(outputPath);
    return mp4;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function ensureCompositionWrapper(
  html: string,
  opts: { width: number; height: number; durationSeconds: number }
): string {
  if (html.includes('data-composition-id')) {
    return html;
  }

  const compositionRoot = `<div
    id="hyperframes-root"
    data-composition-id="ad"
    data-start="0"
    data-width="${opts.width}"
    data-height="${opts.height}"
    style="width:${opts.width}px;height:${opts.height}px;position:relative;overflow:hidden;"
  >`;

  const clipWrapper = `<div
    class="clip"
    data-start="0"
    data-duration="${opts.durationSeconds}"
    data-track-index="0"
    style="width:100%;height:100%;"
  >`;

  let result = html.replace(
    /<body([^>]*)>/i,
    `<body$1>${compositionRoot}${clipWrapper}`
  );
  result = result.replace(/<\/body>/i, `</div></div></body>`);

  return result;
}
