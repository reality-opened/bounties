import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import {
  CLIENT_EVENTS,
  CONNECT_ERROR_CODES,
  REST_PATHS,
  SERVER_EVENTS,
  base64ToFloat32Array,
  type PlaceBeaconPayload,
  type AgentState,
  type AgentUICommand,
  type DetectionPreviewRequest,
  type DetectionQueriesPayload,
  type PlanResponse,
  type PersistedScene,
  type ReconstructionOnlyPayload,
  type SceneReport,
  type SceneListItem,
  type SLAMUpdate,
} from '@reality/protocol';
import { Server } from 'socket.io';
import fullUpdate from '../fixtures/slam_update.full.json';
import incrementalOne from '../fixtures/slam_update.incremental-1.json';
import incrementalTwo from '../fixtures/slam_update.incremental-2.json';
import sceneReport from '../fixtures/scene_report.ready.json';

const mockPlan: PlanResponse = {
  objects: [
    { name: 'chair', confidence: 0.86 },
    { name: 'desk', confidence: 0.74 },
  ],
  justification: 'Mock plan based on the requested scene goal.',
  waypoints: [[0, 0, 0], [1, 0, 1]],
};

const mockSceneList: SceneListItem[] = [
  {
    scan_id: 'mock-scan',
    created_at: 1760000000,
    room_type: 'office',
    summary: 'Mock room scan with a chair.',
    object_count: 1,
    point_count: 6,
    thumbnail: null,
  },
];

const mockPersistedScene: PersistedScene = {
  scan_id: 'mock-scan',
  created_at: 1760000000,
  report: sceneReport as SceneReport,
  facts: (sceneReport as SceneReport).facts,
  keyframes: [],
  points_key: null,
  point_count: 6,
  scene_center: [1, 0, 0],
};

const mockAgentState: AgentState = {
  enabled: true,
  scene_description: 'Mock office',
  room_type: 'office',
  missions: [
    {
      id: 1,
      category: 'inspection',
      goal: 'Find relevant objects',
      queries: ['chair', 'desk'],
      found: ['chair'],
      status: 'active',
      confidence: 0.72,
      findings_count: 1,
    },
  ],
  active_queries: ['chair', 'desk'],
  discovered_objects: ['chair'],
  current_goal: 'Find relevant objects',
  submaps_processed: 2,
  coverage_estimate: 0.5,
  health: 'ok',
};

const mockUiCommand: AgentUICommand = {
  id: 'ui-1',
  name: 'show_toast',
  args: { message: 'Mock agent ready' },
};

export interface MockServerHandle {
  port: number;
  url: string;
  close(): Promise<void>;
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += String(chunk);
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

export function resolveMockServerUrl(port: number, host: string, publicUrl?: string | null): string {
  const normalizedPublicUrl = publicUrl?.trim().replace(/\/$/, '');
  if (normalizedPublicUrl) return normalizedPublicUrl;
  const urlHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
  const formattedHost = urlHost.includes(':') && !urlHost.startsWith('[') ? `[${urlHost}]` : urlHost;
  return `http://${formattedHost}:${port}`;
}

export async function startMockServer(
  port = 0,
  host = process.env.MOCK_HOST ?? '127.0.0.1',
  publicUrl = process.env.MOCK_PUBLIC_URL,
): Promise<MockServerHandle> {
  let actualPort = port;
  let serverUrl = resolveMockServerUrl(actualPort, host, publicUrl);
  let io: Server | null = null;
  const deletedScans = new Set<string>();
  let activeDemo: { running: boolean; video_id: string | null; started_at: number | null } = {
    running: false,
    video_id: null,
    started_at: null,
  };
  const httpServer = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    if (request.method === 'GET' && url.pathname === REST_PATHS.HEALTH) {
      return json(response, 200, { status: 'ok', gpu: true, gpu_name: 'mock' });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.SESSION) {
      return json(response, 202, { session_id: 'mock-session', url: serverUrl, status: 'ready' });
    }
    if (request.method === 'GET' && url.pathname === REST_PATHS.SESSION_STATUS) {
      return json(response, 200, { session_id: 'mock-session', url: serverUrl, status: 'ready' });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.AUTH_SESSION) {
      if (url.searchParams.get('force') === CONNECT_ERROR_CODES.NO_SCANS_REMAINING) {
        return json(response, 403, { error: CONNECT_ERROR_CODES.NO_SCANS_REMAINING });
      }
      return json(response, 200, { ok: true });
    }
    if (request.method === 'GET' && url.pathname === REST_PATHS.AUTH_QR_TOKEN) {
      return json(response, 200, { token: 'mock-qr-token' });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.SESSION_REFRESH) {
      return json(response, 200, { token: 'mock-durable-token' });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.SCANS_CONSUME) {
      return json(response, 200, { remaining: 1 });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.ASSISTANT_CHAT) {
      await readBody(request);
      return json(response, 200, {
        answer: 'Mock answer grounded in the fixture.',
        model: 'mock',
        degraded: false,
        focus: null,
        evidence: [],
      });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.PLAN) {
      await readBody(request);
      return json(response, 200, mockPlan);
    }
    if (request.method === 'GET' && url.pathname === REST_PATHS.DEMO_VIDEOS) {
      return json(response, 200, {
        videos: [{
          video_id: 'mock-demo.mp4',
          name: 'Mock Demo',
          thumbnail: null,
          filename: 'mock-demo.mp4',
        }],
      });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.DEMO_START) {
      const payload = JSON.parse((await readBody(request)) || '{}') as { video_id?: string };
      activeDemo = {
        running: true,
        video_id: payload.video_id ?? 'mock-demo.mp4',
        started_at: Date.now() / 1000,
      };
      return json(response, 200, { ok: true, ...activeDemo });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.DEMO_STOP) {
      activeDemo = { running: false, video_id: null, started_at: null };
      return json(response, 200, { ok: true, ...activeDemo });
    }
    if (request.method === 'GET' && url.pathname === REST_PATHS.DEMO_STATUS) {
      return json(response, 200, activeDemo);
    }
    if (request.method === 'GET' && url.pathname === REST_PATHS.DEMO_VIDEO) {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'video/mp4');
      response.end('mock-video');
      return;
    }
    if (request.method === 'GET' && url.pathname === REST_PATHS.SCENES) {
      return json(response, 200, { scenes: mockSceneList.filter((scene) => !deletedScans.has(scene.scan_id)) });
    }
    if (request.method === 'GET' && url.pathname === REST_PATHS.SCENE_DETAIL('mock-scan') && !deletedScans.has('mock-scan')) {
      return json(response, 200, mockPersistedScene);
    }
    if (request.method === 'GET' && url.pathname === REST_PATHS.SCENE_POINTS('mock-scan') && !deletedScans.has('mock-scan')) {
      return json(response, 200, fullUpdate);
    }
    if (request.method === 'DELETE' && url.pathname === REST_PATHS.SCENE_DETAIL('mock-scan')) {
      deletedScans.add('mock-scan');
      return json(response, 200, { ok: true });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.SCENE_QA('mock-scan') && !deletedScans.has('mock-scan')) {
      await readBody(request);
      return json(response, 200, {
        answer: 'Mock persisted-scene answer.',
        model: 'mock',
        degraded: false,
        focus: { name: 'chair', center: [1, 0, 0] },
        evidence: [],
      });
    }
    if (request.method === 'POST' && url.pathname === REST_PATHS.RESET) {
      io?.emit(SERVER_EVENTS.SLAM_RESET);
      return json(response, 200, { ok: true });
    }

    return json(response, 404, { error: 'not_found' });
  });

  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.use((socket, next) => {
    const forced = socket.handshake.query.force_error;
    if (
      forced === CONNECT_ERROR_CODES.SESSION_BUSY ||
      forced === CONNECT_ERROR_CODES.AT_CAPACITY ||
      forced === CONNECT_ERROR_CODES.NO_SCANS_REMAINING
    ) {
      const error = new Error(String(forced)) as Error & { data?: { error: string } };
      error.data = { error: String(forced) };
      next(error);
      return;
    }
    if (!socket.handshake.auth?.token) {
      const error = new Error('missing token') as Error & { data?: { error: string } };
      error.data = { error: 'unauthorized' };
      next(error);
      return;
    }
    next();
  });

  io.on('connection', (socket) => {
    let activeQueries = ['chair'];
    let reconstructionOnly = false;
    socket.emit(SERVER_EVENTS.CONNECTED, { status: 'ok' });
    socket.on(CLIENT_EVENTS.START_SLAM, () => {
      socket.emit(SERVER_EVENTS.SLAM_UPDATE, fullUpdate as SLAMUpdate);
    });
    socket.on(CLIENT_EVENTS.STOP_SLAM, () => {
      socket.emit(SERVER_EVENTS.SLAM_STOPPED);
    });
    socket.on(CLIENT_EVENTS.FRAME, () => {
      socket.emit(SERVER_EVENTS.FRAME_RECEIVED, { status: 'ok' });
      socket.emit(SERVER_EVENTS.SLAM_UPDATE, incrementalOne as SLAMUpdate);
      socket.emit(SERVER_EVENTS.DETECTION_PARTIAL, {
        detections: reconstructionOnly ? [] : incrementalOne.detections ?? [],
        active_queries: activeQueries,
        is_final: false,
      });
      socket.emit(SERVER_EVENTS.SCENE_REPORT_UPDATE, { ...sceneReport, progressive: true, final: false } as SceneReport);
      socket.emit(SERVER_EVENTS.SCENE_REPORT_READY, sceneReport as SceneReport);
    });
    socket.on(CLIENT_EVENTS.SET_DETECTION_QUERIES, (payload: DetectionQueriesPayload) => {
      activeQueries = payload.queries;
      socket.emit(SERVER_EVENTS.DETECTION_PARTIAL, {
        detections: reconstructionOnly ? [] : incrementalOne.detections ?? [],
        active_queries: activeQueries,
        is_final: false,
      });
    });
    socket.on(CLIENT_EVENTS.GET_DETECTION_PREVIEW, (payload: DetectionPreviewRequest) => {
      socket.emit(SERVER_EVENTS.DETECTION_PREVIEW, {
        query: payload.query,
        submap_id: payload.submap_id,
        frame_idx: payload.frame_idx,
        keyframe_image: 'mock-keyframe',
        mask_image: 'mock-mask',
      });
    });
    socket.on(CLIENT_EVENTS.SET_RECONSTRUCTION_ONLY, (payload: ReconstructionOnlyPayload) => {
      reconstructionOnly = payload.enabled;
    });
    socket.on(CLIENT_EVENTS.GET_GLOBAL_MAP, () => {
      socket.emit(SERVER_EVENTS.GLOBAL_MAP, incrementalTwo as SLAMUpdate);
    });
    socket.on(CLIENT_EVENTS.GET_SCENE_REPORT, () => {
      socket.emit(SERVER_EVENTS.SCENE_REPORT_UPDATE, { ...sceneReport, progressive: true, final: false } as SceneReport);
      socket.emit(SERVER_EVENTS.SCENE_REPORT_READY, sceneReport as SceneReport);
    });
    socket.on(CLIENT_EVENTS.PLACE_BEACON, (payload: PlaceBeaconPayload) => {
      socket.emit(SERVER_EVENTS.BEACON_QUEUED, { beacon_id: payload.beacon_id });
      socket.emit(SERVER_EVENTS.SLAM_UPDATE, {
        ...incrementalOne,
        resolved_beacons: [{ beacon_id: payload.beacon_id, x: 1, y: 0, z: 0 }],
      } as SLAMUpdate);
    });
    socket.on(CLIENT_EVENTS.CLEAR_BEACONS, () => {
      socket.emit(SERVER_EVENTS.SLAM_UPDATE, {
        ...incrementalOne,
        resolved_beacons: [],
      } as SLAMUpdate);
    });
    socket.on(CLIENT_EVENTS.AGENT_SET_GOAL, () => {
      socket.emit(SERVER_EVENTS.AGENT_STATE, mockAgentState);
      socket.emit(SERVER_EVENTS.AGENT_ACTION, {
        id: 'action-1',
        timestamp: Date.now() / 1000,
        action: 'mission_created',
        details: 'Mock mission created',
        mission_id: 1,
        queries: ['chair', 'desk'],
      });
      socket.emit(SERVER_EVENTS.AGENT_THOUGHT, {
        id: 'thought-1',
        timestamp: Date.now() / 1000,
        type: 'thinking',
        content: 'Planning the mock inspection.',
      });
      socket.emit(SERVER_EVENTS.AGENT_FINDING, {
        id: 'finding-1',
        timestamp: Date.now() / 1000,
        query: 'chair',
        description: 'Found a chair in the fixture.',
        confidence: 0.81,
        position: [1, 0, 0],
        mission_id: 1,
      });
      socket.emit(SERVER_EVENTS.AGENT_UI_COMMAND, mockUiCommand);
      socket.emit(SERVER_EVENTS.AGENT_TOOL_EVENT, {
        id: 'tool-1',
        tool: 'detection',
        status: 'succeeded',
      });
      socket.emit(SERVER_EVENTS.AGENT_TASK_EVENT, {
        id: 'task-1',
        timestamp: Date.now() / 1000,
        task_type: 'mission',
        name: 'Mock mission',
        status: 'started',
        mission_id: 1,
      });
      socket.emit(SERVER_EVENTS.AGENT_JOB_EVENT, {
        job_id: 'job-1',
        job_name: 'Mock job',
        status: 'succeeded',
      });
    });
    socket.on(CLIENT_EVENTS.GET_AGENT_STATE, () => {
      socket.emit(SERVER_EVENTS.AGENT_STATE, mockAgentState);
    });
    socket.on(CLIENT_EVENTS.AGENT_CHAT, (payload: { message: string }) => {
      socket.emit(SERVER_EVENTS.AGENT_THOUGHT, {
        id: 'chat-1',
        timestamp: Date.now() / 1000,
        type: 'chat_response',
        content: `Mock response: ${payload.message}`,
      });
    });
  });

  const handle: MockServerHandle = await new Promise((resolve) => {
    httpServer.listen(port, host, () => {
      const address = httpServer.address();
      actualPort = typeof address === 'object' && address ? address.port : port;
      serverUrl = resolveMockServerUrl(actualPort, host, publicUrl);
      resolve({
        port: actualPort,
        url: serverUrl,
        close: async () => {
          await new Promise<void>((closeResolve) => io.close(() => closeResolve()));
          await new Promise<void>((closeResolve, closeReject) => {
            httpServer.close((err) => {
              if (!err || (err as NodeJS.ErrnoException).code === 'ERR_SERVER_NOT_RUNNING') {
                closeResolve();
              } else {
                closeReject(err);
              }
            });
          });
        },
      });
    });
  });

  return handle;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void (async () => {
    const port = Number(process.env.PORT ?? 4300);
    const server = await startMockServer(port);
    const vertices = base64ToFloat32Array(fullUpdate.points_b64).length / 3;
    console.log(`Open Reality mock server listening at ${server.url} with ${vertices} fixture vertices`);
  })().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
