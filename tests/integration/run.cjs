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

  const fileSupport = require('../../out/integration/create-file.cjs')
  const path = require('node:path')
  const packRoot = vscode.workspace.workspaceFolders[0].uri
  const functionFolder = vscode.Uri.joinPath(packRoot, 'data/example/functions')
  const fileConfig = { env: { dateFormat: 'yyyy-mm-dd' }, createFile: { fileTemplate: {
    function: ['# %fileResourcePath% %date%', 'say %fileName%', '%cursor%']
  } } }
  async function createResource(folder, name, options = {}) {
    const effects = { opened: 0, errors: [], logs: [], validation: undefined }
    const { getFileTypeFromRel } = fileSupport.createFileTypeResolver()
    const command = fileSupport.createFileCommand({
      getDatapackRoot: async () => packRoot, getPackFormat: async () => 7,
      isDatapackRoot: async () => true, getDate: () => '2026-10-11',
      getFileType: (uri, root, format) => getFileTypeFromRel(path.posix.relative(root.path, uri.path) + '/', format),
      getNamespace: (uri, root) => fileSupport.namespaceFromRelative(path.posix.relative(root.path, uri.path)),
      getResourcePath: (uri, root, format, type) => fileSupport.resourcePathFromRelative(path.posix.relative(root.path, uri.path), format, type),
      joinPath: vscode.Uri.joinPath, basename: uri => path.posix.basename(uri.path),
      dirname: uri => uri.with({ path: path.posix.dirname(uri.path) }),
      pathAccessible: fileSupport.pathAccessible,
      getTextEditor: () => {
        if (!vscode.window.activeTextEditor) throw new fileSupport.NotOpenTextDocumentError()
        return vscode.window.activeTextEditor
      },
      listenInput: async (_message, validate) => {
        if (options.cancel) throw new fileSupport.UserCancelledError()
        effects.validation = await validate(name)
        if (effects.validation) throw new fileSupport.UserCancelledError()
        return name
      },
      confirmDatapack: async () => 'no', createDatapack: async () => assert.fail('unexpected datapack setup'),
      create: fileSupport.createFile,
      openFile: async (uri, selection) => {
        effects.opened++
        const range = selection && new vscode.Range(selection.line, selection.character, selection.line, selection.character)
        await vscode.window.showTextDocument(uri, { selection: range })
      },
      locale: (key, ...params) => [key, ...params].join(':'),
      showError: message => effects.errors.push(message), log: message => effects.logs.push(message)
    })
    await command(folder, fileConfig)
    return effects
  }
  const generated = vscode.Uri.joinPath(functionFolder, 'generated.mcfunction')
  const success = await createResource(functionFolder, 'generated')
  const generatedBytes = await vscode.workspace.fs.readFile(generated)
  assert.equal(Buffer.from(generatedBytes).toString('utf8'), '# example:generated 2026-10-11\r\nsay generated\r\n')
  assert.equal(success.opened, 1)
  assert.deepEqual(success.errors, [])
  assert.equal(vscode.window.activeTextEditor.document.uri.toString(), generated.toString())
  assert.equal(vscode.window.activeTextEditor.selection.start.line, 2)
  assert.equal(vscode.window.activeTextEditor.selection.start.character, 0)
  const duplicate = await createResource(functionFolder, 'generated')
  assert.match(duplicate.validation, /error.already-exists/)
  assert.equal(duplicate.opened, 0)
  assert.deepEqual(await vscode.workspace.fs.readFile(generated), generatedBytes)
  const cancelled = await createResource(functionFolder, 'cancelled', { cancel: true })
  assert.equal(cancelled.opened, 0)
  assert.deepEqual(cancelled.errors, [])
  assert.equal(await fileSupport.pathAccessible(vscode.Uri.joinPath(functionFolder, 'cancelled.mcfunction')), false)
  console.log('PASS real file creation, cursor placement, duplicate protection, and cancellation')

  const deniedEvents = new vscode.EventEmitter()
  const denied = vscode.workspace.registerFileSystemProvider('mcdu-denied', {
    onDidChangeFile: deniedEvents.event,
    watch: () => new vscode.Disposable(() => {}),
    stat: uri => { throw vscode.FileSystemError.FileNotFound(uri) },
    readDirectory: uri => { throw vscode.FileSystemError.FileNotFound(uri) },
    readFile: uri => { throw vscode.FileSystemError.FileNotFound(uri) },
    createDirectory: uri => { throw vscode.FileSystemError.NoPermissions(uri) },
    writeFile: uri => { throw vscode.FileSystemError.NoPermissions(uri) },
    rename: uri => { throw vscode.FileSystemError.NoPermissions(uri) },
    delete: uri => { throw vscode.FileSystemError.NoPermissions(uri) }
  }, { isReadonly: true, isCaseSensitive: true })
  try {
    const failure = await createResource(functionFolder.with({ scheme: 'mcdu-denied' }), 'failed')
    assert.equal(failure.opened, 0)
    assert.equal(failure.errors.length, 1)
    assert.equal(failure.logs.length, 1)
  } finally { denied.dispose(); deniedEvents.dispose() }
  console.log('PASS write denial from a real VS Code filesystem provider is reported')

  const originalClipboard = await vscode.env.clipboard.readText()
  try {
    await vscode.env.clipboard.writeText('integration sentinel')
    await vscode.commands.executeCommand('mcdutil.commands.copyResourcePath', uri)
    await eventually(() => vscode.env.clipboard.readText(), text => text === 'example:sample')
    const resourceFixtures = require('../fixtures/resource-paths.json')
    const names = ['legacy nested function', 'modern function', 'legacy block tag', 'modern block tag', 'modern function tag', 'recipe', 'worldgen nested type']
    for (const name of names) {
      const fixture = resourceFixtures.find(item => item.name === name)
      const root = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, `resource-pack-${fixture.packFormat}`)
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root, 'data'))
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(root, 'pack.mcmeta'), Buffer.from(JSON.stringify({ pack: { pack_format: fixture.packFormat, description: 'Integration fixture' } })))
      const path = fixture.path.split('/')
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root, ...path.slice(0, -1)))
      const file = vscode.Uri.joinPath(root, ...path)
      await vscode.workspace.fs.writeFile(file, Buffer.from(file.path.endsWith('.mcfunction') ? 'say fixture\n' : '{}\n'))
      await vscode.env.clipboard.writeText('integration sentinel')
      await vscode.commands.executeCommand('mcdutil.commands.copyResourcePath', file)
      await eventually(() => vscode.env.clipboard.readText(), text => text === fixture.resource)
      console.log(`PASS resource path clipboard: ${fixture.name}`)
    }
  } finally {
    await vscode.env.clipboard.writeText(originalClipboard)
  }
  console.log('PASS resource path command writes the real clipboard')
}
