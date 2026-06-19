import assert from 'node:assert/strict';
import test from 'node:test';
import { POWER_ACTIONS, toHostSystemAction } from '../src/system/powerActions.js';

test('exposes the four desktop power actions in reference order', () => {
  assert.deepEqual(
    POWER_ACTIONS.map((action) => action.id),
    ['lock', 'sleep', 'shutdown', 'restart']
  );
});

test('routes only host lifecycle actions through the WinForms bridge', () => {
  assert.deepEqual(toHostSystemAction('shutdown'), {
    type: 'FUSION_SYSTEM_ACTION',
    data: { action: 'shutdown' }
  });
  assert.deepEqual(toHostSystemAction('restart'), {
    type: 'FUSION_SYSTEM_ACTION',
    data: { action: 'restart' }
  });
  assert.equal(toHostSystemAction('lock'), null);
  assert.equal(toHostSystemAction('sleep'), null);
});
