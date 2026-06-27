import { createHmac } from 'node:crypto';
import { ProviderRegistry } from '../src/provider/provider-registry';
import { createGeminiAdapter } from '../src/provider/gemini-adapter';
import { createRenderAdapter } from '../src/provider/render-adapter';

// Phase 3 provider seam: registry resolution, Gemini sync adapter, render
// adapter HMAC verification + idempotency event id. Pure unit (no DB/app).

describe('ProviderRegistry (R03-3)', () => {
  it('resolves mock/unconfigured kinds to null', () => {
    const reg = new ProviderRegistry({} as NodeJS.ProcessEnv);
    expect(reg.resolve('mock')).toBeNull();
    expect(reg.resolve(undefined)).toBeNull();
    expect(reg.resolve('gemini')).toBeNull();
  });

  it('registers gemini from GEMINI_API_KEY and render from PROVIDER_<KIND>_API_URL', () => {
    const reg = new ProviderRegistry({ GEMINI_API_KEY: 'k', PROVIDER_RENDER_API_URL: 'https://r.dev', PROVIDER_RENDER_SECRET: 's' } as NodeJS.ProcessEnv);
    expect(reg.resolve('gemini')).not.toBeNull();
    expect(reg.resolve('render')).not.toBeNull();
    expect(reg.resolve('mock')).toBeNull();
  });
});

describe('Gemini adapter (AIGEN-1/4)', () => {
  it('returns inline text synchronously', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'hello world' }] } }] }) })) as unknown as typeof fetch;
    const adapter = createGeminiAdapter({ apiKey: 'k', fetchImpl: fakeFetch });
    expect(adapter.synchronous).toBe(true);
    const res = await adapter.submit({ id: 'j1', workspaceId: 'w1', type: 'copywriting_create', moduleId: 'copywriting_create', prompt: 'hi', input: {}, providerKind: 'gemini' });
    expect(res.immediate?.status).toBe('succeeded');
    expect(res.immediate?.artifacts?.[0]?.text).toBe('hello world');
  });

  it('fails gracefully without a credential', async () => {
    const adapter = createGeminiAdapter({ apiKey: undefined, fetchImpl: (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch });
    const res = await adapter.submit({ id: 'j2', workspaceId: 'w1', type: 'image', moduleId: 'image', prompt: 'p', input: {}, providerKind: 'gemini' });
    expect(res.immediate?.status).toBe('failed');
  });
});

describe('Render adapter callback verification (R03-4)', () => {
  const secret = 'topsecret';
  const fixedNow = 1_780_000_000_000;
  const adapter = createRenderAdapter({ kind: 'render', apiUrl: 'https://r.dev', secret, now: () => fixedNow, fetchImpl: (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch });
  const body = JSON.stringify({ taskId: 't1', status: 'completed', eventId: 'evt-1', artifacts: [{ url: 'https://x/y.mp4', kind: 'video' }] });
  const ts = Math.floor(fixedNow / 1000);
  const sig = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

  it('accepts a valid signature and extracts the event id', () => {
    const ok = adapter.verifyCallback!(body, { 'x-provider-signature': `t=${ts},v1=${sig}` });
    expect(ok.ok).toBe(true);
    expect(ok.externalEventId).toBe('evt-1');
  });

  it('rejects a tampered signature', () => {
    const tampered = adapter.verifyCallback!(body, { 'x-provider-signature': `t=${ts},v1=${'0'.repeat(sig.length)}` });
    expect(tampered.ok).toBe(false);
  });

  it('rejects an expired timestamp', () => {
    const staleTs = Math.floor((fixedNow - 10 * 60 * 1000) / 1000);
    const staleSig = createHmac('sha256', secret).update(`${staleTs}.${body}`).digest('hex');
    const stale = adapter.verifyCallback!(body, { 'x-provider-signature': `t=${staleTs},v1=${staleSig}` });
    expect(stale.ok).toBe(false);
  });

  it('maps a terminal callback body to canonical status + artifacts', () => {
    const mapped = adapter.mapCallback!(JSON.parse(body));
    expect(mapped.status).toBe('succeeded');
    expect(mapped.artifacts).toHaveLength(1);
  });
});
