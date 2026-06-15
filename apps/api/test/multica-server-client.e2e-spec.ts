import { createMulticaServerClient, mapMulticaTaskStatus } from '../src/orchestration/multica-server-client';

describe('MulticaServerClient (contract)', () => {
  it('mapMulticaTaskStatus maps daemon states to canonical job status', () => {
    expect(mapMulticaTaskStatus('queued')).toBe('pending');
    expect(mapMulticaTaskStatus('pending')).toBe('pending');
    expect(mapMulticaTaskStatus('in_progress')).toBe('running');
    expect(mapMulticaTaskStatus('running')).toBe('running');
    expect(mapMulticaTaskStatus('completed')).toBe('succeeded');
    expect(mapMulticaTaskStatus('succeeded')).toBe('succeeded');
    expect(mapMulticaTaskStatus('failed')).toBe('failed');
    expect(mapMulticaTaskStatus('error')).toBe('failed');
    expect(mapMulticaTaskStatus('cancelled')).toBe('cancelled');
    expect(mapMulticaTaskStatus('canceled')).toBe('cancelled');
    expect(mapMulticaTaskStatus('weird_unknown')).toBe('running'); // unknown 非终态 → running
  });

  it('getTask hits GET /api/tasks/:id and returns mapped snapshot', async () => {
    const calls: Array<{ url: string; auth?: string }> = [];
    const fakeFetch = (async (url: string, init?: any) => {
      calls.push({ url, auth: init?.headers?.Authorization });
      return new Response(JSON.stringify({ id: 't1', status: 'in_progress', progress: 42, current_step: 'running tests' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch;
    const client = createMulticaServerClient({ apiUrl: 'http://multica', token: 'svc-token', fetchImpl: fakeFetch })!;
    const snap = await client.getTask('t1');
    expect(calls[0].url).toBe('http://multica/api/tasks/t1');
    expect(calls[0].auth).toBe('Bearer svc-token');
    expect(snap).toEqual({ status: 'running', progress: 42, currentStep: 'running tests', raw: { id: 't1', status: 'in_progress', progress: 42, current_step: 'running tests' } });
  });

  it('getArtifacts hits GET /api/tasks/:id/artifacts and returns array', async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ artifacts: [{ id: 'a1', url: 'http://f/1', kind: 'image' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;
    const client = createMulticaServerClient({ apiUrl: 'http://multica', token: 't', fetchImpl: fakeFetch })!;
    const arts = await client.getArtifacts('t1');
    expect(arts).toEqual([{ id: 'a1', url: 'http://f/1', kind: 'image' }]);
  });

  it('factory returns null when apiUrl missing (degraded reconciliation)', () => {
    expect(createMulticaServerClient({ apiUrl: undefined, token: 't' })).toBeNull();
  });
});
