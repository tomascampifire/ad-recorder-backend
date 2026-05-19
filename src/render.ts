/* eslint-disable @typescript-eslint/no-require-imports */
// Use require() to bypass the Fps/GPUTextureUsage type errors in @hyperframes typedefs
const { createRenderJob, executeRenderJob } = require('@hyperframes/producer');

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

  // HyperFrames expects the composition root element to have specific data attributes:
  //   data-composition-id, data-width, data-height
  // and timed elements to have data-start, data-duration, data-track-index, class="clip"
  //
  // Claude Design ad files come as plain HTML pages without these attributes.
  // ensureCompositionWrapper injects a compatible wrapper so Producer can render them.
  const ensuredHtml = ensureCompositionWrapper(htmlContent, {
    width,
    height,
    durationSeconds,
  });

  await writeFile(inputPath, ensuredHtml, 'utf-8');

  try {
    // createRenderJob signature: (input, output, fps, quality?, options?)
    // fps must be a string literal ("24" | "30" | "60") per the HyperFrames Fps type
    const job = createRenderJob(
      inputPath,
      outputPath,
      String(fps),
      quality,
      {
        format: 'mp4',
        workers: 1,    // Sequential — one render at a time per container
        useGpu: false, // Railway containers have no GPU
      }
    );

    await executeRenderJob(job);

    const mp4 = await readFile(outputPath);
    return mp4;
  } finally {
    // Always clean up the temp directory
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Ensures the HTML has a HyperFrames-compatible composition wrapper.
 *
 * If the HTML already contains data-composition-id (i.e. it was authored
 * as a HyperFrames composition), this is a no-op.
 *
 * Otherwise, the existing body content is wrapped in:
 *   1. A composition root div (data-composition-id, data-width, data-height)
 *   2. A single clip div (class="clip", data-start, data-duration, data-track-index)
 *
 * This makes any self-contained HTML ad (e.g. Claude Design exports) renderable
 * as a single clip running for the full specified duration.
 */
function ensureCompositionWrapper(
  html: string,
  opts: { width: number; height: number; durationSeconds: number }
): string {
  if (html.includes('data-composition-id')) {
    return html; // Already a valid HyperFrames composition
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

  // Insert wrappers immediately after <body ...> and close them before </body>
  let result = html.replace(
    /<body([^>]*)>/i,
    `<body$1>${compositionRoot}${clipWrapper}`
  );
  result = result.replace(/<\/body>/i, `</div></div></body>`);

  return result;
}
