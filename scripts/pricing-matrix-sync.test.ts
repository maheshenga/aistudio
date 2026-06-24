/**
 * P1-R02: Keep API commercial-pricing.ts in sync with frontend usageRepository matrix.
 */

import assert from 'node:assert/strict';
import { COMMERCIAL_USAGE_PRICING as API_PRICING } from '../apps/api/src/billing/commercial-pricing.ts';
import { COMMERCIAL_USAGE_PRICING as UI_PRICING } from '../src/lib/data/usageRepository.ts';

type Action = 'generation' | 'export' | 'automation' | 'runtime_dispatch';

function flatten(matrix: Record<string, Partial<Record<Action, { unitCredits: number }>>>) {
  const out = new Map<string, number>();
  for (const [moduleId, actions] of Object.entries(matrix)) {
    for (const [action, entry] of Object.entries(actions ?? {})) {
      if (!entry) continue;
      out.set(`${moduleId}:${action}`, entry.unitCredits);
    }
  }
  return out;
}

async function run() {
  const api = flatten(API_PRICING);
  const ui = flatten(UI_PRICING);

  for (const [key, apiCredits] of api) {
    assert.equal(ui.get(key), apiCredits, `API/UI mismatch for ${key}: api=${apiCredits} ui=${ui.get(key)}`);
  }

  for (const [key, uiCredits] of ui) {
    if (!key.endsWith(':generation') && !key.endsWith(':automation') && !key.endsWith(':runtime_dispatch')) {
      continue;
    }
    assert.ok(api.has(key), `API matrix missing hold-relevant entry ${key} (ui=${uiCredits})`);
    assert.equal(api.get(key), uiCredits, `API/UI mismatch for ${key}`);
  }

  assert.equal(api.get('image:generation'), 8);
  assert.equal(api.get('video:generation'), 24);
  assert.equal(api.get('remix_smart:generation'), 20);
  assert.equal(api.get('director_desk:generation'), 6);

  console.log(`pricing matrix sync passed (${api.size} API entries, ${ui.size} UI entries).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
