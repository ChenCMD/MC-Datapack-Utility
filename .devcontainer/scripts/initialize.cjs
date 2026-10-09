// Runs on the host. Root-file snapshots stay local and are mounted read-only.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function ensureSnapshotDirectory(directory) {
  try {
    fs.mkdirSync(directory, { mode: 0o700 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const info = fs.lstatSync(directory);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error(`Snapshot directory must be a real directory: ${directory}`);
  }
}

function writeSnapshot(source, target) {
  const temporary = `${target}.${randomUUID()}.tmp`;
  // Exclusive creation refuses existing files and symlinks; use the descriptor
  // for writing and permissions so neither operation follows a path link.
  const descriptor = fs.openSync(temporary, 'wx', 0o600);
  try {
    try {
      fs.writeFileSync(descriptor, fs.readFileSync(source));
      fs.fchmodSync(descriptor, 0o600);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.renameSync(temporary, target);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function hostOverrides(home, platform = process.platform, identifier = 'test', directory = path.resolve(__dirname, '..')) {
  if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) throw new Error('Invalid DevContainer ID');
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const escape = value => value.replaceAll('$', () => '$$');
  const volumes = ['.codex', '.claude', '.agents'].map(name => ({
    type: 'bind',
    source: escape(paths.join(home, name)),
    target: `/mnt/host-settings/${name}`,
    read_only: true,
    bind: { create_host_path: false }
  }));
  // Directory binds survive atomic replacement of the files inside them.
  volumes.push({ type: 'bind', source: escape(paths.join(directory, 'host-settings')),
    target: '/mnt/host-settings', read_only: true,
    bind: { create_host_path: false } });
  volumes.push(
    { type: 'volume', source: 'home', target: '/home/node' },
    { type: 'volume', source: 'node-modules', target: '/workspaces/MC-Datapack-Utility/node_modules' }
  );
  return { volumes: {
    home: { name: `mcdu-home-${identifier}` },
    'node-modules': { name: `mcdu-node-modules-${identifier}` }
  }, services: { devcontainer: {
    environment: { MCDU_HOST_HOME: escape(home) }, volumes
  } } };
}

function initialize(home = os.homedir(), directory = path.resolve(__dirname, '..'), identifier = 'test') {
  for (const name of ['.codex', '.claude', '.agents']) {
    fs.mkdirSync(path.join(home, name), { recursive: true });
  }
  const staging = path.join(directory, 'host-settings');
  ensureSnapshotDirectory(staging);
  fs.chmodSync(staging, 0o700);
  // Mount targets must exist beneath the read-only parent mount.
  for (const name of ['.codex', '.claude', '.agents']) {
    ensureSnapshotDirectory(path.join(staging, name));
  }
  for (const name of ['.claude.json', 'CLAUDE.md', 'AGENTS.md']) {
    const source = path.join(home, name);
    const target = path.join(staging, name);
    if (fs.existsSync(source) && fs.statSync(source).isFile()) {
      // Refresh through rename so readers never observe a partial snapshot.
      writeSnapshot(source, target);
    } else {
      fs.rmSync(target, { force: true });
    }
  }
  // JSON is valid YAML. Compose reads this generated override after compose.yaml.
  fs.writeFileSync(path.join(directory, 'compose.host.yaml'),
    JSON.stringify(hostOverrides(home, process.platform, identifier, directory), null, 2) + '\n', { mode: 0o600 });
}

module.exports = { hostOverrides, initialize };
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Run initialization through Dev Containers');
  initialize(os.homedir(), path.resolve(__dirname, '..'), process.argv[2]);
}
