import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminPin, hasAdminPermission, getAllowedTabs, DEFAULT_ADMIN_PIN } from './auth.ts';

test('verifyAdminPin: correctly verifies PIN against default and custom values', () => {
  assert.equal(verifyAdminPin('1234', DEFAULT_ADMIN_PIN), true);
  assert.equal(verifyAdminPin(' 1234 ', DEFAULT_ADMIN_PIN), true); // whitespace trimmed
  assert.equal(verifyAdminPin('0000', DEFAULT_ADMIN_PIN), false);
  assert.equal(verifyAdminPin('custom88', 'custom88'), true);
  assert.equal(verifyAdminPin('wrong', 'custom88'), false);
});

test('hasAdminPermission: verifies role capability', () => {
  assert.equal(hasAdminPermission('admin'), true);
  assert.equal(hasAdminPermission('public'), false);
});

test('getAllowedTabs: restricts sensitive students tab for public users', () => {
  const publicTabs = getAllowedTabs('public');
  assert.equal(publicTabs.includes('students'), false);
  assert.equal(publicTabs.includes('dashboard'), true);

  const adminTabs = getAllowedTabs('admin');
  assert.equal(adminTabs.includes('students'), true);
  assert.equal(adminTabs.length, 4);
});
