export type RuntimeMode = 'web' | 'desktop_multica' | 'self_hosted_multica';

export type RuntimeProviderKind = 'mock' | 'multica' | 'gemini' | 'render';

export type RuntimeHealth =
  | 'available'
  | 'degraded'
  | 'offline'
  | 'auth_expired'
  | 'incompatible';

export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type RuntimeCapability =
  | 'runtime_status'
  | 'list_agents'
  | 'list_tasks'
  | 'create_task'
  | 'cancel_task'
  | 'task_events'
  | 'daemon_controls'
  | 'daemon_logs';

export type MulticaDaemonState =
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'installing_cli'
  | 'cli_not_found'
  | 'auth_expired';

export interface RuntimeStatus {
  mode: RuntimeMode;
  providerKind: RuntimeProviderKind;
  health: RuntimeHealth;
  label: string;
  message: string;
  serverUrl?: string;
  wsUrl?: string;
  appUrl?: string;
  bridgeAvailable: boolean;
  daemonState?: MulticaDaemonState;
  daemonId?: string;
  deviceName?: string;
  runtimeCount: number;
  cliProviders: string[];
  capabilities: RuntimeCapability[];
  lastHeartbeatAt?: string;
  compatibilityWarning?: string;
}

export interface RawMulticaDaemonStatus {
  state: MulticaDaemonState;
  pid?: number;
  uptime?: string;
  daemonId?: string;
  deviceName?: string;
  agents?: string[];
  workspaceCount?: number;
  profile?: string;
  serverUrl?: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  role: string;
  provider: string;
  runtimeId?: string;
  runtimeMode: 'cloud' | 'local' | 'mock';
  status: 'idle' | 'working' | 'blocked' | 'error' | 'offline';
  maxConcurrentTasks?: number;
  source: RuntimeProviderKind;
}

export interface AgentTask {
  id: string;
  title: string;
  description?: string;
  status: AgentTaskStatus;
  agentId?: string;
  runtimeId?: string;
  progress?: number;
  source: RuntimeProviderKind;
  externalRef?: {
    system: 'multica';
    issueId?: string;
    taskId?: string;
    issueIdentifier?: string;
  };
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface TaskQuery {
  status?: AgentTaskStatus;
  agentId?: string;
  runtimeId?: string;
}

export interface CreateAgentTaskInput {
  title: string;
  description: string;
  agentId?: string;
  runtimeId?: string;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, string | number | boolean>;
}

export interface AgentTaskEvent {
  taskId: string;
  status: AgentTaskStatus;
  progress?: number;
  message?: string;
  occurredAt: string;
}

export type Unsubscribe = () => void;

export interface AgentRuntimeProvider {
  mode: RuntimeMode;
  providerKind: RuntimeProviderKind;
  getRuntimeStatus(): Promise<RuntimeStatus>;
  listAgents(): Promise<AgentSummary[]>;
  listTasks(params?: TaskQuery): Promise<AgentTask[]>;
  createTask(input: CreateAgentTaskInput): Promise<AgentTask>;
  cancelTask(taskId: string): Promise<void>;
  subscribeToTask(taskId: string, cb: (event: AgentTaskEvent) => void): Unsubscribe;
  subscribeToRuntime(cb: (status: RuntimeStatus) => void): Unsubscribe;
}

export class RuntimeCapabilityError extends Error {
  constructor(
    readonly code:
      | 'TASK_DISPATCH_UNAVAILABLE'
      | 'TASK_CANCEL_UNAVAILABLE'
      | 'DESKTOP_BRIDGE_UNAVAILABLE'
      | 'MULTICA_API_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'RuntimeCapabilityError';
  }
}
