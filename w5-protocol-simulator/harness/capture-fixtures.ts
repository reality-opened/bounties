import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { CLIENT_EVENTS, SERVER_EVENTS, type SceneReport, type SLAMUpdate } from '@reality/protocol';
import { io } from 'socket.io-client';

const workerUrl = process.env.MODAL_WORKER_URL;
const token = process.env.MODAL_WORKER_TOKEN;

if (!workerUrl || !token) {
  throw new Error('Set MODAL_WORKER_URL and MODAL_WORKER_TOKEN to capture live fixtures.');
}

void (async () => {
  const outDir = resolve(dirname(new URL(import.meta.url).pathname), 'fixtures');
  await mkdir(outDir, { recursive: true });

  const socket = io(workerUrl, {
    transports: ['websocket'],
    auth: { token },
  });

  const slamUpdates: SLAMUpdate[] = [];
  let report: SceneReport | null = null;

  async function finish(): Promise<void> {
    socket.disconnect();
    const files: string[] = [];
    await Promise.all(
      slamUpdates.slice(0, 3).map((update, index) => {
        const file = `captured-slam-${index + 1}.json`;
        files.push(file);
        return writeFile(resolve(outDir, file), `${JSON.stringify(update, null, 2)}\n`);
      }),
    );
    if (report) {
      files.push('captured-scene-report.json');
      await writeFile(resolve(outDir, 'captured-scene-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    }
    await writeFile(
      resolve(outDir, 'manifest.json'),
      `${JSON.stringify(
        {
          source: 'live_worker',
          captured_at: new Date().toISOString(),
          files,
        },
        null,
        2,
      )}\n`,
    );
    process.exit(0);
  }

  socket.on(SERVER_EVENTS.SLAM_UPDATE, (payload) => {
    slamUpdates.push(decimate(payload));
    if (slamUpdates.length >= 3 && report) {
      void finish();
    }
  });
  socket.on(SERVER_EVENTS.GLOBAL_MAP, (payload) => {
    slamUpdates.push(decimate(payload));
  });
  socket.on(SERVER_EVENTS.SCENE_REPORT_READY, (payload) => {
    report = payload;
    if (slamUpdates.length >= 3) {
      void finish();
    }
  });
  socket.on('connect', () => {
    socket.emit(CLIENT_EVENTS.START_SLAM);
    socket.emit(CLIENT_EVENTS.GET_GLOBAL_MAP);
  });

  setTimeout(() => {
    void finish();
  }, 20000);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

function decimate(update: SLAMUpdate): SLAMUpdate {
  return {
    ...update,
    points: [],
    colors: [],
    n_points: Math.min(update.n_points, 5000),
  };
}
