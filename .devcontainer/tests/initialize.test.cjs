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
    assert.equal(result.services.devcontainer.volumes.filter(mount => mount.type === 'bind').length, 4);
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


test('root files are refreshed through a stable directory mount after atomic host replacement', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdu-root-files-'));
  try {
    const home = path.join(directory, 'home');
    fs.mkdirSync(home);
    fs.writeFileSync(path.join(home, '.claude.json'), 'old');
    initialize(home, directory);
    const readMounts = () => JSON.parse(fs.readFileSync(path.join(directory, 'compose.host.yaml'))).services.devcontainer.volumes;
    const root = readMounts().find(m => m.target === '/mnt/host-settings');
    assert.ok(root, 'mount the directory rather than individual files');
    assert.ok(!readMounts().some(m => m.target === '/mnt/host-settings/.claude.json'));
    const inode = fs.statSync(root.source).ino;
    fs.writeFileSync(path.join(home, 'replacement'), 'new');
    fs.renameSync(path.join(home, 'replacement'), path.join(home, '.claude.json'));
    initialize(home, directory);
    assert.equal(fs.statSync(root.source).ino, inode);
    assert.equal(fs.readFileSync(path.join(root.source, '.claude.json'), 'utf8'), 'new');
    if (process.platform !== 'win32') {
      assert.equal(fs.statSync(root.source).mode & 0o777, 0o700);
      assert.equal(fs.statSync(path.join(root.source, '.claude.json')).mode & 0o777, 0o600);
    }
    fs.unlinkSync(path.join(home, '.claude.json'));
    initialize(home, directory);
    assert.ok(!fs.existsSync(path.join(root.source, '.claude.json')));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

for (const scenario of ['root', 'dangling root', 'mount target']) {
  test(`snapshot initialization rejects a ${scenario} symlink without changing its destination`, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdu-snapshot-link-'));
    try {
      const home = path.join(directory, 'home');
      fs.mkdirSync(home, { mode: 0o750 });
      fs.writeFileSync(path.join(home, '.claude.json'), 'original host settings', { mode: 0o640 });
      const originalMode = fs.statSync(home).mode;
      const originalFileMode = fs.statSync(path.join(home, '.claude.json')).mode;
      const staging = path.join(directory, 'host-settings');
      let link = staging;
      let destination = home;
      if (scenario === 'dangling root') destination = path.join(directory, 'missing');
      if (scenario === 'mount target') {
        fs.mkdirSync(staging);
        link = path.join(staging, '.codex');
      }
      fs.symlinkSync(destination, link, process.platform === 'win32' ? 'junction' : 'dir');
      assert.throws(() => initialize(home, directory), /Snapshot directory must be a real directory/);
      assert.equal(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'), 'original host settings');
      assert.equal(fs.statSync(home).mode, originalMode);
      assert.equal(fs.statSync(path.join(home, '.claude.json')).mode, originalFileMode);
      assert.ok(fs.lstatSync(link).isSymbolicLink());
      assert.ok(!fs.existsSync(path.join(directory, 'compose.host.yaml')));
      if (scenario === 'dangling root') assert.ok(!fs.existsSync(destination));
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

test('a legacy temporary symlink cannot overwrite another host file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdu-snapshot-temp-'));
  try {
    const home = path.join(directory, 'home');
    fs.mkdirSync(home);
    fs.writeFileSync(path.join(home, '.claude.json'), 'snapshot settings');
    const staging = path.join(directory, 'host-settings');
    fs.mkdirSync(staging);
    const outside = path.join(directory, 'outside');
    fs.writeFileSync(outside, 'keep this host file', { mode: 0o640 });
    const originalMode = fs.statSync(outside).mode;
    const temporary = path.join(staging, '.claude.json.tmp');
    fs.symlinkSync(outside, temporary, 'file');
    initialize(home, directory);
    assert.equal(fs.readFileSync(outside, 'utf8'), 'keep this host file');
    assert.equal(fs.statSync(outside).mode, originalMode);
    assert.ok(fs.lstatSync(temporary).isSymbolicLink());
    const snapshot = path.join(staging, '.claude.json');
    assert.ok(fs.lstatSync(snapshot).isFile());
    assert.equal(fs.readFileSync(snapshot, 'utf8'), 'snapshot settings');
    assert.deepEqual(fs.readdirSync(staging).filter(name => name.endsWith('.tmp')), ['.claude.json.tmp']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('an existing snapshot symlink is replaced without changing the linked file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdu-snapshot-target-'));
  try {
    const home = path.join(directory, 'home');
    fs.mkdirSync(home);
    fs.writeFileSync(path.join(home, 'AGENTS.md'), 'new instructions');
    const staging = path.join(directory, 'host-settings');
    fs.mkdirSync(staging);
    const outside = path.join(directory, 'outside');
    fs.writeFileSync(outside, 'original instructions');
    fs.symlinkSync(outside, path.join(staging, 'AGENTS.md'), 'file');
    initialize(home, directory);
    assert.equal(fs.readFileSync(outside, 'utf8'), 'original instructions');
    assert.ok(fs.lstatSync(path.join(staging, 'AGENTS.md')).isFile());
    assert.equal(fs.readFileSync(path.join(staging, 'AGENTS.md'), 'utf8'), 'new instructions');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('failed snapshot replacement removes only its own temporary file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdu-snapshot-failure-'));
  try {
    const home = path.join(directory, 'home');
    fs.mkdirSync(home);
    fs.writeFileSync(path.join(home, '.claude.json'), 'host settings');
    const staging = path.join(directory, 'host-settings');
    fs.mkdirSync(staging);
    fs.mkdirSync(path.join(staging, '.claude.json'));
    fs.writeFileSync(path.join(staging, '.claude.json', 'keep'), 'existing content');
    assert.throws(() => initialize(home, directory));
    assert.equal(fs.readFileSync(path.join(staging, '.claude.json', 'keep'), 'utf8'), 'existing content');
    assert.equal(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'), 'host settings');
    assert.deepEqual(fs.readdirSync(staging).filter(name => name.endsWith('.tmp')), []);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
