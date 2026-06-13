import type { RawMulticaDaemonStatus } from './agentRuntimeTypes.ts';

export const multicaDaemonStatusFixtures = {
  running: {
    state: 'running',
    pid: 18044,
    uptime: '2h10m',
    daemonId: 'daemon_local_001',
    deviceName: 'Windows Workstation',
    agents: ['codex', 'claude', 'gemini'],
    workspaceCount: 1,
    profile: 'default',
    serverUrl: 'http://127.0.0.1:3000',
  },
  stopped: {
    state: 'stopped',
    deviceName: 'Windows Workstation',
    agents: [],
    workspaceCount: 0,
    serverUrl: 'http://127.0.0.1:3000',
  },
  authExpired: {
    state: 'auth_expired',
    deviceName: 'Windows Workstation',
    agents: [],
    workspaceCount: 0,
    serverUrl: 'http://127.0.0.1:3000',
  },
  cliNotFound: {
    state: 'cli_not_found',
    deviceName: 'Windows Workstation',
    agents: [],
    workspaceCount: 0,
    serverUrl: 'http://127.0.0.1:3000',
  },
} satisfies Record<string, RawMulticaDaemonStatus>;

export const multicaRuntimeFixture = {
  id: 'runtime_codex_local_001',
  workspace_id: 'workspace_aistudio_001',
  daemon_id: 'daemon_local_001',
  name: 'Codex Local Runtime',
  runtime_mode: 'local',
  provider: 'codex',
  launch_header: 'codex',
  status: 'online',
  device_info: 'Windows 11',
  metadata: { cli_version: '0.1.0' },
  owner_id: 'user_001',
  visibility: 'private',
  last_seen_at: '2026-06-09T00:00:00.000Z',
  created_at: '2026-06-09T00:00:00.000Z',
  updated_at: '2026-06-09T00:00:00.000Z',
} as const;

export const multicaAgentFixture = {
  id: 'agent_codex_001',
  workspace_id: 'workspace_aistudio_001',
  runtime_id: 'runtime_codex_local_001',
  name: 'Codex Local Agent',
  description: 'Runs local desktop agent tasks through Multica.',
  runtime_mode: 'local',
  status: 'idle',
  max_concurrent_tasks: 1,
  model: 'gpt-5.5',
  owner_id: 'user_001',
} as const;

export const multicaIssueFixture = {
  id: 'issue_001',
  identifier: 'AIS-1',
  title: 'Generate e-commerce campaign copy',
  description: 'Create campaign copy for a product launch.',
  status: 'todo',
  priority: 'medium',
  assignee_type: 'agent',
  assignee_id: 'agent_codex_001',
  created_at: '2026-06-09T00:00:00.000Z',
  updated_at: '2026-06-09T00:00:00.000Z',
} as const;

export const multicaTaskFixture = {
  id: 'task_001',
  agent_id: 'agent_codex_001',
  runtime_id: 'runtime_codex_local_001',
  issue_id: 'issue_001',
  status: 'running',
  priority: 50,
  dispatched_at: '2026-06-09T00:00:10.000Z',
  started_at: '2026-06-09T00:00:12.000Z',
  completed_at: null,
  result: null,
  error: null,
  created_at: '2026-06-09T00:00:00.000Z',
  kind: 'quick_create',
} as const;
