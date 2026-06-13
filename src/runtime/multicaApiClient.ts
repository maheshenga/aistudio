export interface MulticaApiClientOptions {
  apiUrl: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

export interface MulticaCreateIssueRequest {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_type?: string;
  assignee_id?: string;
  parent_issue_id?: string;
  project_id?: string;
  start_date?: string;
  due_date?: string;
  attachment_ids?: string[];
}

export interface MulticaApiClient {
  listAgents(workspaceId?: string): Promise<unknown[]>;
  listRuntimes(workspaceId?: string, owner?: 'me'): Promise<unknown[]>;
  createIssue(input: MulticaCreateIssueRequest): Promise<Record<string, unknown>>;
  cancelTask(taskId: string): Promise<void>;
}

function normalizeBaseUrl(apiUrl: string): string {
  return apiUrl.replace(/\/+$/, '');
}

function headers(token?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJsonResponse(response: Response, endpoint: string): Promise<unknown> {
  if (!response.ok) {
    let message = `${endpoint} failed with ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = `${endpoint} failed with ${response.status} ${response.statusText}`;
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined;
  return response.json() as Promise<unknown>;
}

export function createMulticaApiClient(options: MulticaApiClientOptions): MulticaApiClient {
  const baseUrl = normalizeBaseUrl(options.apiUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async listAgents(workspaceId?: string) {
      const search = new URLSearchParams();
      if (workspaceId) search.set('workspace_id', workspaceId);
      const query = search.toString();
      const response = await fetchImpl(`${baseUrl}/api/agents${query ? `?${query}` : ''}`, {
        headers: headers(options.token),
      });
      return parseJsonResponse(response, 'GET /api/agents') as Promise<unknown[]>;
    },
    async listRuntimes(workspaceId?: string, owner?: 'me') {
      const search = new URLSearchParams();
      if (workspaceId) search.set('workspace_id', workspaceId);
      if (owner) search.set('owner', owner);
      const query = search.toString();
      const response = await fetchImpl(`${baseUrl}/api/runtimes${query ? `?${query}` : ''}`, {
        headers: headers(options.token),
      });
      return parseJsonResponse(response, 'GET /api/runtimes') as Promise<unknown[]>;
    },
    async createIssue(input: MulticaCreateIssueRequest) {
      const response = await fetchImpl(`${baseUrl}/api/issues`, {
        method: 'POST',
        headers: headers(options.token),
        body: JSON.stringify(input),
      });
      return parseJsonResponse(response, 'POST /api/issues') as Promise<Record<string, unknown>>;
    },
    async cancelTask(taskId: string) {
      const response = await fetchImpl(`${baseUrl}/api/tasks/${encodeURIComponent(taskId)}/cancel`, {
        method: 'POST',
        headers: headers(options.token),
      });
      await parseJsonResponse(response, 'POST /api/tasks/:id/cancel');
    },
  };
}
