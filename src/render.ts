import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// Patch puppeteer-core BEFORE importing HyperFrames producer.
// Both share the same module instance so HyperFrames will see the patched version.
// Injects --no-sandbox and --disable-dev-shm-usage required for Docker/Railway.
import puppeteer from 'puppeteer-core';
const _originalLaunch = puppeteer.launch.bind(puppeteer);
(puppeteer as any).launch = (options: any = {}) => {
  const dockerFlags = ['--no-sandbox', '--disable-dev-shm-usage'];
  console.log('[patch] puppeteer.launch — injecting Docker flags');
  return _originalLaunch({
    ...options,
    args: [...(options.args || []), ...dockerFlags],
  });
};

import { createRenderJob, executeRenderJob } from '@hyperframes/producer';

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
  const inputPath = join(inputDir, 'index.html');
  const outputPath = join(workDir, 'output.mp4');

  await mkdir(inputDir, { recursive: true });

  let processedHtml = htmlContent;

  // Remove CDN @hyperframes/core runtime — producer injects its own version.
  processedHtml = processedHtml.replace(
    /<script[^>]*@hyperframes\/core[^>]*><\/script>/gi,
    '<!-- hyperframes/core runtime injected by producer -->'
  );

  processedHtml = ensureCompositionWrapper(processedHtml, { width, height, durationSeconds });

  await writeFile(inputPath, processedHtml, 'utf-8');

  try {
    // Pass fps as a STRING — the CLI passes it as a string arg and that works.
    // Passing as a number causes the HyperFrames type system to silently reject it
    // and leave fps as undefined, which causes FFmpeg's "undefined/undefined" error.
    // @ts-ignore
    const job = createRenderJob({
      fps: String(fps),
      quality,
      format: 'mp4',
      workers: 1,
      useGpu: false,
    });

    // @ts-ignore — types require 3+ args; paths are required at runtime
    await executeRenderJob(job, inputDir, outputPath);

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

  const wrapper = `<div
    id="hyperframes-root"
    data-composition-id="ad"
    data-start="0"
    data-width="${opts.width}"
    data-height="${opts.height}"
    style="width:${opts.width}px;height:${opts.height}px;position:relative;overflow:hidden;"
  >`;

  const clipOpener = `<div
    class="clip"
    data-start="0"
    data-duration="${opts.durationSeconds}"
    data-track-index="0"
    style="width:100%;height:100%;"
  >`;

  let result = html.replace(
    /<body([^>]*)>/i,
    `<body$1>${wrapper}${clipOpener}`
  );
  result = result.replace(/<\/body>/i, `</div></div></body>`);

  return result;
}
