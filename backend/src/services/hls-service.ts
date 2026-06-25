import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MediaAsset } from '../routes/lms/media/media-asset-model';
import {
  isStorageConfigured,
  getObjectBuffer,
  putObject,
  deleteObject,
  deletePrefix,
} from './storage-service';

const SEGMENT_SECONDS = 6;

/** Adaptive-bitrate ladder (rung is used only when ≤ the source height). */
const LADDER = [
  { h: 360, vb: '800k', ab: '96k' },
  { h: 480, vb: '1400k', ab: '128k' },
  { h: 720, vb: '2800k', ab: '128k' },
  { h: 1080, vb: '5000k', ab: '192k' },
];

let ffmpegChecked = false;
let ffmpegOk = false;

/** Whether ffmpeg is on PATH (cached after first check). */
export function ffmpegAvailable(): Promise<boolean> {
  if (ffmpegChecked) return Promise.resolve(ffmpegOk);
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-version']);
    p.on('error', () => {
      ffmpegChecked = true;
      ffmpegOk = false;
      resolve(false);
    });
    p.on('close', (code) => {
      ffmpegChecked = true;
      ffmpegOk = code === 0;
      resolve(ffmpegOk);
    });
  });
}

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd });
    let err = '';
    p.stderr?.on('data', (d) => {
      err += d.toString();
    });
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.slice(-400)}`))
    );
  });
}

/** Probe the source video height (0 if unknown). */
function probeHeight(file: string, cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', file],
      { cwd }
    );
    let out = '';
    p.stdout?.on('data', (d) => {
      out += d.toString();
    });
    p.on('error', () => resolve(0));
    p.on('close', () => {
      const h = parseInt(out.trim(), 10);
      resolve(Number.isFinite(h) ? h : 0);
    });
  });
}

/** Build the ffmpeg args for an N-rung encrypted ABR HLS render (flat layout). */
function buildArgs(input: string, rungs: typeof LADDER): string[] {
  const n = rungs.length;
  const splits = rungs.map((_, i) => `[v${i}]`).join('');
  const scales = rungs.map((r, i) => `[v${i}]scale=-2:${r.h}[v${i}o]`).join(';');
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
    '-filter_complex', `[0:v]split=${n}${splits};${scales}`,
  ];
  rungs.forEach((_, i) => {
    args.push('-map', `[v${i}o]`, '-map', '0:a:0?');
  });
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac');
  rungs.forEach((r, i) => {
    args.push(`-b:v:${i}`, r.vb, `-b:a:${i}`, r.ab);
  });
  args.push(
    '-hls_key_info_file', 'key_info',
    '-hls_time', String(SEGMENT_SECONDS),
    '-hls_playlist_type', 'vod',
    '-var_stream_map', rungs.map((_, i) => `v:${i},a:${i}`).join(' '),
    '-master_pl_name', 'master.m3u8',
    '-hls_segment_filename', 'stream_%v_%03d.ts',
    'stream_%v.m3u8'
  );
  return args;
}

/**
 * Transcode a confirmed video asset into **AES-128 encrypted, adaptive-bitrate
 * HLS** (multiple renditions + a master playlist) stored in R2 under
 * `hls/<assetId>/`. The 16-byte key is saved on the asset (served only via a
 * gated ticket). On success the raw upload is deleted, so there is no single
 * downloadable file. Best-effort & idempotent: on failure it marks
 * `hlsStatus='failed'` and leaves the raw MP4 in place (MP4 playback fallback).
 */
export async function transcodeToHls(assetId: number): Promise<void> {
  if (!isStorageConfigured()) return;
  if (!(await ffmpegAvailable())) return;

  const asset = await MediaAsset.findByPk(assetId);
  if (!asset || asset.kind !== 'video' || asset.status !== 'ready') return;
  if (asset.hlsStatus === 'ready' || asset.hlsStatus === 'processing') return;

  asset.hlsStatus = 'processing';
  await asset.save();

  const dir = await mkdtemp(join(tmpdir(), `veohls-${assetId}-`));
  // Nest the HLS output under the same course folder as the raw upload
  // (course/<id>/hls/<assetId>/), falling back to the flat layout otherwise.
  const courseScope = asset.storageKey.match(/^(course\/\d+)\//);
  const prefix = courseScope
    ? `${courseScope[1]}/hls/${assetId}/`
    : `hls/${assetId}/`;
  try {
    // 1. download the raw upload
    await writeFile(join(dir, 'input'), await getObjectBuffer(asset.storageKey));

    // 2. AES-128 key + key_info (URI is a placeholder, rewritten at serve time)
    const key = randomBytes(16);
    await writeFile(join(dir, 'enc.key'), key);
    await writeFile(
      join(dir, 'key_info'),
      `veo-key\nenc.key\n${randomBytes(16).toString('hex')}\n`
    );

    // 3. pick renditions ≤ source height, then encode encrypted ABR HLS
    const height = (await probeHeight('input', dir)) || 720;
    let rungs = LADDER.filter((r) => r.h <= height);
    if (rungs.length === 0) rungs = [LADDER[0]];
    await run('ffmpeg', buildArgs('input', rungs), dir);

    // 4. upload master + variant playlists + encrypted segments to R2
    for (const f of await readdir(dir)) {
      if (f.endsWith('.m3u8')) {
        await putObject(prefix + f, await readFile(join(dir, f)), 'application/vnd.apple.mpegurl');
      } else if (f.endsWith('.ts')) {
        await putObject(prefix + f, await readFile(join(dir, f)), 'video/mp2t');
      }
    }

    // 5. record key + locations, then delete the raw upload (no plain file remains)
    asset.hlsKeyB64 = key.toString('base64');
    asset.hlsPlaylistKey = prefix + 'master.m3u8';
    asset.hlsPrefix = prefix;
    asset.hlsStatus = 'ready';
    await asset.save();
    await deleteObject(asset.storageKey).catch(() => undefined);
  } catch (err) {
    console.error(`HLS transcode failed for asset ${assetId}:`, (err as Error).message);
    try {
      asset.hlsStatus = 'failed';
      await asset.save();
    } catch {
      /* ignore */
    }
    await deletePrefix(prefix).catch(() => undefined);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
