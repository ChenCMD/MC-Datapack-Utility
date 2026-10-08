const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { hostOverrides, initialize } = require('../scripts/initialize.cjs');

test('Windows paths do not depend on HOME or Bash', () => {
  const result = hostOverrides('C:\\Users\\Some Developer', 'win32').services.devcontainer;
  assert.equal(result.volumes[0].source, 'C:\\Users\\Some Developer\\.codex');
  assert.equal(result.volumes[0].target, '/mnt/host-settings/.codex');
  assert.ok(result.volumes.filter(mount => mount.type === 'bind').every(mount => mount.read_only));
});

test('macOS paths and Compose interpolation characters are handled', () => {
  const result = hostOverrides('/Users/A Developer$test', 'darwin').services.devcontainer;
  assert.equal(result.volumes[0].source, '/Users/A Developer$$test/.codex');
  assert.equal(result.environment.MCDU_HOST_HOME, '/Users/A Developer$$test');
});

test('host without agents initializes without creating instruction or credential stubs', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdu-initialize-'));
  try {
    const home = path.join(directory, 'home');
    initialize(home, directory);
    const result = JSON.parse(fs.readFileSync(path.join(directory, 'compose.host.yaml'), 'utf8'));
    assert.equal(result.services.devcontainer.volumes.filter(mount => mount.type === 'bind').length, 3);
    assert.ok(fs.existsSync(path.join(home, '.codex')));
    assert.ok(!fs.existsSync(path.join(home, 'AGENTS.md')));
    fs.writeFileSync(path.join(home, 'AGENTS.md'), 'Existing instructions');
    initialize(home, directory);
    assert.equal(fs.readFileSync(path.join(home, 'AGENTS.md'), 'utf8'), 'Existing instructions');
    const mounts = JSON.parse(fs.readFileSync(path.join(directory, 'compose.host.yaml'), 'utf8'));
    assert.equal(mounts.services.devcontainer.volumes.filter(mount => mount.type === 'bind').length, 4);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
