const assert = require('node:assert/strict')
const vscode = require('vscode')
const fixtures = require('../fixtures/score-operation.json')

async function eventually(read, predicate) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const value = await read()
    if (predicate(value)) return value
    await new Promise(resolve => setTimeout(resolve, 25))
  }
  assert.fail('Timed out waiting for the command effect')
}

exports.run = async function run() {
  console.log(`Testing VS Code ${vscode.version}`)
  if (process.env.VSCODE_TEST_VERSION && process.env.VSCODE_TEST_VERSION !== 'stable') {
    assert.equal(vscode.version, process.env.VSCODE_TEST_VERSION, 'requested host version is running')
  }
  const extension = vscode.extensions.getExtension('ChenCMD.mc-datapack-utility')
  assert.ok(extension, 'extension is installed in the test host')
  await extension.activate()
  const commands = await vscode.commands.getCommands(true)
  for (const command of extension.packageJSON.contributes.commands) {
    assert.ok(commands.includes(command.command), `${command.command} is registered`)
  }
  console.log('PASS extension activation and five command registrations')

  const document = await vscode.workspace.openTextDocument({ language: 'mcfunction', content: 'a = 1' })
  const editor = await vscode.window.showTextDocument(document)
  editor.selection = new vscode.Selection(0, 0, 0, 5)
  await vscode.commands.executeCommand('mcdutil.commands.scoreOperation')
  const output = await eventually(() => document.getText(), text => text !== 'a = 1')
  const fixture = fixtures.find(item => item.name === 'assignment')
  const english = require('../../src/locales/en.json')
  assert.equal(output.replace(/\r\n/g, '\n'), [
    '# a = 1',
    `# ${english['formula-to-score-operation.complete-text']}`,
    'scoreboard objectives add _ dummy',
    ...fixture.expected.constants,
    '',
    ...fixture.expected.commands
  ].join('\n'))
  console.log('PASS score command replaces the real editor selection')

  const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'data/example/functions/sample.mcfunction')
  const originalClipboard = await vscode.env.clipboard.readText()
  try {
    await vscode.env.clipboard.writeText('integration sentinel')
    await vscode.commands.executeCommand('mcdutil.commands.copyResourcePath', uri)
    await eventually(() => vscode.env.clipboard.readText(), text => text === 'example:sample')
  } finally {
    await vscode.env.clipboard.writeText(originalClipboard)
  }
  console.log('PASS resource path command writes the real clipboard')
}
