// Runs on the host. Only paths are written locally; credentials stay on the host.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function hostOverrides(home, platform = process.platform, identifier = 'test') {
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
  for (const name of ['.claude.json', 'CLAUDE.md', 'AGENTS.md']) {
    const source = paths.join(home, name);
    if (fs.existsSync(source) && fs.statSync(source).isFile()) {
      volumes.push({ type: 'bind', source: escape(source),
        target: `/mnt/host-settings/${name}`, read_only: true,
        bind: { create_host_path: false } });
    }
  }
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
  // JSON is valid YAML. Compose reads this generated override after compose.yaml.
  fs.writeFileSync(path.join(directory, 'compose.host.yaml'),
    JSON.stringify(hostOverrides(home, process.platform, identifier), null, 2) + '\n', { mode: 0o600 });
}

module.exports = { hostOverrides, initialize };
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Run initialization through Dev Containers');
  initialize(os.homedir(), path.resolve(__dirname, '..'), process.argv[2]);
}
