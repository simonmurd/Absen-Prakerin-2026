import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminPin, DEFAULT_ADMIN_PIN } from './auth.ts';

test('verifyAdminPin: validates default PIN 17881520 and rejects incorrect PINs', () => {
  assert.equal(DEFAULT_ADMIN_PIN, '17881520');
  assert.equal(verifyAdminPin('17881520'), true);
  assert.equal(verifyAdminPin(' 17881520 '), true);
  assert.equal(verifyAdminPin('1234'), false);
  assert.equal(verifyAdminPin('0000'), false);
  assert.equal(verifyAdminPin(''), false);
});
