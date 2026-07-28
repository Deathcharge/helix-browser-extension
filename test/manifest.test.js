const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../helix_browser_extension/helix-browser-extension/manifest.json');
test('ships a minimal Manifest V3 permission set', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'scripting', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.background, undefined);
});
