import assert from 'node:assert/strict';
import { authTokenStore } from '../src/saas/authTokenStore.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const store = authTokenStore(createMemoryStorage());
  assert.equal(store.getAccess(), null);
  assert.equal(store.getRefresh(), null);
  store.set({ accessToken: 'a1', refreshToken: 'r1' });
  assert.equal(store.getAccess(), 'a1');
  assert.equal(store.getRefresh(), 'r1');
  store.set({ accessToken: 'a2', refreshToken: 'r2' });
  assert.equal(store.getAccess(), 'a2');
  store.clear();
  assert.equal(store.getAccess(), null);
  assert.equal(store.getRefresh(), null);
  console.log('auth token store passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
