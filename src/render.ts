import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const HYPERFRAMES_BIN = '/app/node_modules/.bin/hyperframes';

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
    const { stdout, stderr } = await execFileAsync(
      HYPERFRAMES_BIN,
      [
        'render',
        inputDir,
        '--output', outputPath,
        '--fps', String(fps),
        '--quality', quality,
        '--non-interactive',
      ],
      {
        cwd: inputDir,
        timeout: 300_000,
        env: { ...process.env, DISPLAY: '' },
      }
    );

    if (stdout) console.log('[hyperframes]', stdout.trim());
    if (stderr) console.log('[hyperframes stderr]', stderr.trim());

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
