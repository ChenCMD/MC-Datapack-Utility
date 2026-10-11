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

  for (const name of ['assignment', 'hex literal', 'conditional']) {
    const fixture = fixtures.find(item => item.name === name);
    const document = await vscode.workspace.openTextDocument({ language: 'mcfunction', content: fixture.expression });
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(document.positionAt(0), document.positionAt(fixture.expression.length));
    await vscode.commands.executeCommand('mcdutil.commands.scoreOperation');
    const output = await eventually(() => document.getText(), text => text !== fixture.expression);
    const english = require('../../src/locales/en.json');
    assert.equal(output.replace(/\r\n/g, '\n'), [
      `# ${fixture.expression}`,
      `# ${english['formula-to-score-operation.complete-text']}`,
      'scoreboard objectives add _ dummy',
      ...fixture.expected.constants,
      '',
      ...fixture.expected.commands
    ].join('\n'));
    console.log(`PASS score command replaces the real editor selection: ${name}`);
  }

  const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'data/example/functions/sample.mcfunction')
  const formattingFixtures = require('../fixtures/formatter.json')
  const formattingConfig = vscode.workspace.getConfiguration('mcdutil.mcfFormatter')
  try {
    for (const fixture of formattingFixtures) {
      await formattingConfig.update('doInsertIMPDocument', Boolean(fixture.header), vscode.ConfigurationTarget.Workspace)
      const document = fixture.uri?.root
        ? await vscode.workspace.openTextDocument(uri)
        : await vscode.workspace.openTextDocument({ language: 'mcfunction', content: fixture.input })
      const editor = await vscode.window.showTextDocument(document)
      await editor.edit(builder => {
        builder.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), fixture.input)
        builder.setEndOfLine(fixture.eol === '\r\n' ? vscode.EndOfLine.CRLF : vscode.EndOfLine.LF)
      })
      const options = { insertSpaces: fixture.spaces !== false, tabSize: fixture.tabSize || 2 }
      for (const expected of [fixture.expected, fixture.expected, fixture.expected]) {
        const edits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri, options) ?? []
        assert.ok(Array.isArray(edits), 'formatting provider returned edits')
        if (edits.length > 0) {
          const edit = new vscode.WorkspaceEdit()
          edit.set(document.uri, edits)
          assert.ok(await vscode.workspace.applyEdit(edit), 'formatter edits can be applied')
        }
        assert.equal(document.getText(), expected, fixture.name)
      }
      console.log(`PASS formatter edits and repeated formatting: ${fixture.name}`)
    }
  } finally {
    await formattingConfig.update('doInsertIMPDocument', false, vscode.ConfigurationTarget.Workspace)
  }

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
