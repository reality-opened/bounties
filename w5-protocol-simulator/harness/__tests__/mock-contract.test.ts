import { CLIENT_EVENTS, REST_PATHS, SERVER_EVENTS, base64ToFloat32Array, type SLAMUpdate } from '@reality/protocol';
import { io } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveMockServerUrl, startMockServer, type MockServerHandle } from '../mock-server';

let server: MockServerHandle | null = null;

afterEach(async () => {
  await server?.close();
  server = null;
});

describe('mock server contract', () => {
  it('resolves a public URL for local and device-facing runs', () => {
    expect(resolveMockServerUrl(4300, '127.0.0.1')).toBe('http://127.0.0.1:4300');
    expect(resolveMockServerUrl(4300, '0.0.0.0')).toBe('http://127.0.0.1:4300');
    expect(resolveMockServerUrl(4300, '0.0.0.0', ' http://192.0.2.10:4300/ ')).toBe('http://192.0.2.10:4300');
  });

  it('connects, accepts frames, and emits decodable slam updates', async () => {
    server = await startMockServer();
    const socket = io(server.url, {
      transports: ['websocket'],
      auth: { token: 'test-token' },
    });

    const update = await new Promise<SLAMUpdate>((resolve, reject) => {
      socket.on('connect_error', reject);
      socket.on(SERVER_EVENTS.SLAM_UPDATE, resolve);
      socket.emit(CLIENT_EVENTS.START_SLAM);
      socket.emit(CLIENT_EVENTS.FRAME, { image: 'abc', timestamp: 1 });
    });

    socket.disconnect();

    expect(update.points_b64).toBeTruthy();
    expect(base64ToFloat32Array(update.points_b64 ?? '').length).toBeGreaterThan(0);
  });

  it('serves the QR auth token route from the shared REST contract', async () => {
    server = await startMockServer();

    const response = await fetch(`${server.url}${REST_PATHS.AUTH_QR_TOKEN}`);

    await expect(response.json()).resolves.toEqual({ token: 'mock-qr-token' });
  });

  it('serves demo routes from the shared REST contract', async () => {
    server = await startMockServer();

    await expect(fetch(`${server.url}${REST_PATHS.DEMO_VIDEOS}`).then((response) => response.json())).resolves.toMatchObject({
      videos: [{ video_id: 'mock-demo.mp4' }],
    });
    await expect(
      fetch(`${server.url}${REST_PATHS.DEMO_START}`, {
        method: 'POST',
        body: JSON.stringify({ video_id: 'mock-demo.mp4', fps: 10 }),
      }).then((response) => response.json()),
    ).resolves.toMatchObject({
      running: true,
      video_id: 'mock-demo.mp4',
    });
    await expect(fetch(`${server.url}${REST_PATHS.DEMO_STATUS}`).then((response) => response.json())).resolves.toMatchObject({
      running: true,
      video_id: 'mock-demo.mp4',
    });
    await expect(fetch(`${server.url}${REST_PATHS.DEMO_STOP}`, { method: 'POST' }).then((response) => response.json())).resolves.toMatchObject({
      running: false,
    });
  });
});
