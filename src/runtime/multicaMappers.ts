import type {
  AgentSummary,
  AgentTask,
  AgentTaskStatus,
  RawMulticaDaemonStatus,
  RuntimeHealth,
  RuntimeStatus,
} from './agentRuntimeTypes.ts';

export interface MulticaAgentLike {
  id: string;
  name: string;
  description?: string;
  runtime_id?: string;
  runtime_mode?: string;
  status?: string;
  max_concurrent_tasks?: number;
}

export interface MulticaIssueLike {
  id: string;
  identifier?: string;
  title: string;
  description?: string;
  assignee_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MulticaTaskLike {
  id: string;
  agent_id: string;
  runtime_id: string;
  issue_id: string;
  status: string;
  error?: string | null;
  created_at?: string;
  completed_at?: string | null;
}

function daemonHealth(state: RawMulticaDaemonStatus['state']): RuntimeHealth {
  switch (state) {
    case 'running':
      return 'available';
    case 'starting':
    case 'stopping':
    case 'installing_cli':
      return 'degraded';
    case 'auth_expired':
      return 'auth_expired';
    case 'stopped':
    case 'cli_not_found':
      return 'offline';
  }
}

function daemonMessage(status: RawMulticaDaemonStatus): string {
  switch (status.state) {
    case 'running':
      return status.agents?.length
        ? `Desktop daemon running with ${status.agents.length} CLI provider(s).`
        : 'Desktop daemon running, no CLI providers registered yet.';
    case 'stopped':
      return 'Desktop daemon is stopped. Local tasks cannot run on this device.';
    case 'starting':
      return 'Desktop daemon is starting.';
    case 'stopping':
      return 'Desktop daemon is stopping.';
    case 'installing_cli':
      return 'Desktop daemon is installing required CLI runtime files.';
    case 'cli_not_found':
      return 'Multica CLI setup failed or CLI was not found.';
    case 'auth_expired':
      return 'Multica desktop sign-in expired. Reauthentication is required.';
  }
}

export function mapDaemonStatusToRuntimeStatus(status: RawMulticaDaemonStatus): RuntimeStatus {
  const cliProviders = [...new Set(status.agents ?? [])];
  return {
    mode: 'desktop_multica',
    providerKind: 'multica',
    health: daemonHealth(status.state),
    label: 'Desktop Agent Runtime',
    message: daemonMessage(status),
    serverUrl: status.serverUrl,
    bridgeAvailable: true,
    daemonState: status.state,
    daemonId: status.daemonId,
    deviceName: status.deviceName,
    runtimeCount: cliProviders.length,
    cliProviders,
    capabilities: ['runtime_status', 'list_agents', 'list_tasks', 'daemon_controls', 'daemon_logs'],
    lastHeartbeatAt: new Date().toISOString(),
  };
}

export function mapMulticaAgentToAgentSummary(agent: MulticaAgentLike): AgentSummary {
  const provider = agent.runtime_id?.includes('codex') ? 'codex' : 'multica';
  return {
    id: agent.id,
    name: agent.name,
    role: agent.description || 'Multica agent',
    provider,
    runtimeId: agent.runtime_id,
    runtimeMode: agent.runtime_mode === 'local' ? 'local' : 'cloud',
    status:
      agent.status === 'working'
        ? 'working'
        : agent.status === 'blocked'
          ? 'blocked'
          : agent.status === 'error'
            ? 'error'
            : agent.status === 'offline'
              ? 'offline'
              : 'idle',
    maxConcurrentTasks: agent.max_concurrent_tasks,
    source: 'multica',
  };
}

export function mapMulticaTaskStatus(status: string): AgentTaskStatus {
  switch (status) {
    case 'queued':
    case 'dispatched':
    case 'waiting_local_directory':
      return 'queued';
    case 'running':
      return 'running';
    case 'completed':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'failed';
  }
}

export function mapMulticaIssueToAgentTask(issue: MulticaIssueLike): AgentTask {
  const timestamp = issue.updated_at ?? issue.created_at ?? new Date().toISOString();
  return {
    id: `multica-issue-${issue.id}`,
    title: issue.title,
    description: issue.description,
    status: 'queued',
    agentId: issue.assignee_id,
    source: 'multica',
    externalRef: {
      system: 'multica',
      issueId: issue.id,
      issueIdentifier: issue.identifier,
    },
    createdAt: issue.created_at ?? timestamp,
    updatedAt: timestamp,
  };
}

export function mapMulticaTaskToAgentTask(task: MulticaTaskLike, issue?: MulticaIssueLike): AgentTask {
  const timestamp = task.completed_at ?? task.created_at ?? new Date().toISOString();
  return {
    id: `multica-task-${task.id}`,
    title: issue?.title ?? `Multica task ${task.id}`,
    description: issue?.description,
    status: mapMulticaTaskStatus(task.status),
    agentId: task.agent_id,
    runtimeId: task.runtime_id,
    source: 'multica',
    externalRef: {
      system: 'multica',
      issueId: task.issue_id,
      taskId: task.id,
      issueIdentifier: issue?.identifier,
    },
    createdAt: task.created_at ?? timestamp,
    updatedAt: timestamp,
    error: task.error ?? undefined,
  };
}
