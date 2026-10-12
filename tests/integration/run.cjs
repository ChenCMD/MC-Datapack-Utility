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

  const scoreConfig = vscode.workspace.getConfiguration('mcdutil.scoreOperation')
  const previousScale = scoreConfig.inspect('valueScale')?.workspaceValue
  const previousCustomOperate = scoreConfig.inspect('customOperate')?.workspaceValue
  try {
    for (const name of ['assignment', 'hex literal', 'conditional', 'conditional scale', 'unary minus', 'scale', 'prototype score names']) {
      const fixture = fixtures.find(item => item.name === name);
      await scoreConfig.update('valueScale', fixture.config?.valueScale ?? 1, vscode.ConfigurationTarget.Workspace);
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
    await scoreConfig.update('customOperate', [{ identifier: 'product(', type: 'fn', order: 18, assocLow: 'R', arity: 2,
      destination: { args: ['left', 'right'], namely: 'left * right' } }], vscode.ConfigurationTarget.Workspace)
    for (const scale of [1, 10]) {
      await scoreConfig.update('valueScale', scale, vscode.ConfigurationTarget.Workspace)
      const expression = 'a = product( 2 + 3 , 4 )'
      const document = await vscode.workspace.openTextDocument({ language: 'mcfunction', content: expression })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(document.positionAt(0), document.positionAt(expression.length))
      await vscode.commands.executeCommand('mcdutil.commands.scoreOperation')
      const output = await eventually(() => document.getText(), text => text !== expression)
      const lines = output.split(/\r?\n/)
      const { executeScores } = require('../helpers/scoreboard.cjs')
      const scores = executeScores({ resValues: new Set(lines.filter(line => line.startsWith('scoreboard players set '))),
        resFormulas: lines.filter(line => line.startsWith('scoreboard players operation ') || line.startsWith('execute ')) })
      assert.equal(scores.get('a _'), 20 * scale * scale)
      console.log(`PASS custom function preserves grouped arguments at scale ${scale}`)
    }
  } finally {
    await scoreConfig.update('customOperate', previousCustomOperate, vscode.ConfigurationTarget.Workspace)
    await scoreConfig.update('valueScale', previousScale, vscode.ConfigurationTarget.Workspace)
  }

  for (const expression of ['a = if( ( b > 1 ) )', 'a = if( b > 1 , 2 , 3 , 4 )']) {
    const document = await vscode.workspace.openTextDocument({ language: 'mcfunction', content: expression })
    const editor = await vscode.window.showTextDocument(document)
    editor.selection = new vscode.Selection(document.positionAt(0), document.positionAt(expression.length))
    await vscode.commands.executeCommand('mcdutil.commands.scoreOperation')
    assert.equal(document.getText(), expression, 'invalid input must preserve the editor content')
    console.log(`PASS malformed score expression returns without editing: ${expression}`)
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
      getDatapackRoot: async () => options.root || packRoot, getPackFormat: async () => options.packFormat ?? 7,
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
    await command(folder, options.config || fileConfig)
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
  const cursorConfig = { ...fileConfig, createFile: { fileTemplate: {
    function: ['header', 'say %fileName% %CURSOR%tail']
  } } }
  const expandedCursor = await createResource(functionFolder, 'cursor-position', { config: cursorConfig })
  assert.equal(expandedCursor.opened, 1)
  assert.deepEqual(expandedCursor.errors, [])
  assert.equal(vscode.window.activeTextEditor.document.getText(), 'header\r\nsay cursor-position tail')
  assert.equal(vscode.window.activeTextEditor.selection.start.line, 1)
  assert.equal(vscode.window.activeTextEditor.selection.start.character, 20)
  const duplicate = await createResource(functionFolder, 'generated')
  assert.match(duplicate.validation, /error.already-exists/)
  assert.equal(duplicate.opened, 0)
  assert.deepEqual(await vscode.workspace.fs.readFile(generated), generatedBytes)
  const cancelled = await createResource(functionFolder, 'cancelled', { cancel: true })
  assert.equal(cancelled.opened, 0)
  assert.deepEqual(cancelled.errors, [])
  assert.equal(await fileSupport.pathAccessible(vscode.Uri.joinPath(functionFolder, 'cancelled.mcfunction')), false)
  console.log('PASS real file creation, cursor placement, duplicate protection, and cancellation')
  for (const name of ['/', '../escape', '/absolute', 'nested//sample', 'nested/../sample', 'nested//']) {
    const invalid = await createResource(functionFolder, name)
    assert.match(invalid.validation, /error.invalid-file-name/)
    assert.equal(invalid.opened, 0)
    assert.deepEqual(invalid.errors, [])
  }
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(functionFolder, 'nested'))
  const nested = await createResource(functionFolder, 'nested/a.b-c_d')
  assert.equal(nested.opened, 1)
  assert.deepEqual(nested.errors, [])
  assert.equal(vscode.window.activeTextEditor.document.getText(), '# example:nested/a.b-c_d 2026-10-11\r\nsay nested/a.b-c_d\r\n')

  const projectFixture = require('../fixtures/projecttsb/compatibility.json')
  const projectRoot = vscode.Uri.joinPath(packRoot, 'projecttsb-compatibility')
  await vscode.workspace.fs.createDirectory(projectRoot)
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(projectRoot, 'pack.mcmeta'), Buffer.from('{"pack":{"pack_format":26,"description":"Compatibility fixture"}}'))
  const tsbConfig = { ...fileConfig, createFile: { fileTemplate: projectFixture.projects[0].settings['mcdutil.createFile.fileTemplate'] } }
  const unnamedClipboard = await vscode.env.clipboard.readText()
  try {
    for (const [folderPath, name, expected, extension] of [
      ['data/api/functions', 'damage/', 'api:damage/', 'mcfunction'],
      ['data/asset/functions/object/example/tick', '', 'asset:object/example/tick/', 'mcfunction'],
      ['data/asset/tags/functions/artifact/sneak', '', 'asset:artifact/sneak/', 'json'],
      ['data/minecraft/tags/damage_type', 'bypasses_cooldown', 'minecraft:bypasses_cooldown', 'json'],
      ['data/tsb_armor/trim_pattern', '1118', 'tsb_armor:1118', 'json']
    ]) {
      const folder = vscode.Uri.joinPath(projectRoot, folderPath)
      const destination = vscode.Uri.joinPath(folder, name + '.' + extension)
      await vscode.workspace.fs.createDirectory(folder)
      const destinationParent = destination.with({ path: path.posix.dirname(destination.path) })
      if (name === 'damage/') assert.equal(await fileSupport.pathAccessible(destinationParent), false)
      else await vscode.workspace.fs.createDirectory(destinationParent)
      const options = { root: projectRoot, packFormat: 26, config: tsbConfig }
      const created = await createResource(folder, name, options)
      assert.equal(created.validation, undefined)
      assert.equal(created.opened, 1)
      assert.deepEqual(created.errors, [])
      if (name === 'damage/') assert.equal(await fileSupport.pathAccessible(destinationParent), true)
      const content = await vscode.workspace.fs.readFile(destination)
      if (extension === 'mcfunction') {
        assert.ok(Buffer.from(content).toString('utf8').startsWith('#> ' + expected + '\r\n'))
        assert.equal(vscode.window.activeTextEditor.selection.start.line, 2)
        assert.equal(vscode.window.activeTextEditor.selection.start.character, 2)
      }
      const existing = await createResource(folder, name, options)
      assert.match(existing.validation, /error.already-exists/)
      assert.equal(existing.opened, 0)
      assert.deepEqual(await vscode.workspace.fs.readFile(destination), content)
      await vscode.commands.executeCommand('mcdutil.commands.copyResourcePath', destination)
      await eventually(() => vscode.env.clipboard.readText(), text => text === expected)
    }
  } finally { await vscode.env.clipboard.writeText(unnamedClipboard) }
  console.log('PASS ProjectTSB unnamed resources, custom headers, cursor, duplicate protection and clipboard IDs')

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

  const wizardRoot = vscode.Uri.joinPath(packRoot, 'wizard-created')
  const wizardFile = vscode.Uri.joinPath(wizardRoot, 'data/example/function/load.mcfunction')
  const wizardEffects = { errors: [], warnings: [], completed: 0 }
  const wizardItems = [{ label: 'Test', generates: [{ type: 'file', rel: 'data/%namespace%/function/load.mcfunction', content: ['# %fileResourcePath%', 'say %namespace%'] }] }]
  const wizardConfig = { env: { dataVersion: 'unused', dateFormat: 'unused' }, createDatapackTemplate: { defaultLoadAndTick: false, defaultVanillaData: false, defaultFolder: false, customTemplate: [] } }
  const wizardGenerator = {
    isGeneratePackMcMeta: true,
    listenGenerateDir: async () => packRoot,
    listenDatapackNameAndRoot: async () => ({ name: 'wizard-created', root: wizardRoot }),
    listenPackFormat: async () => 48,
    listenDatapackDescription: async () => 'Wizard fixture',
    noticeGenerated: async () => { wizardEffects.completed++ }
  }
  const wizardPorts = {
    selectGenerator: async () => wizardGenerator,
    getFsPath: value => value.fsPath, getPath: value => value.path,
    joinPath: vscode.Uri.joinPath, locale: key => key,
    getDate: () => '2026-10-12', getIndent: () => 2,
    getResourcePath: (value, root, format) => fileSupport.resourcePathFromRelative(path.posix.relative(root.path, value.path), format),
    listenInput: async () => 'example', listenPickItem: async () => wizardItems,
    stringValidator: () => undefined,
    defaultTemplates: () => { throw new Error('Defaults are disabled') },
    createProgressBar: async (_title, task) => task(() => {}),
    getVanillaData: async () => { throw new Error('No network template selected') },
    createDirectory: async value => { await vscode.workspace.fs.createDirectory(value) },
    pathAccessible: fileSupport.pathAccessible,
    createFile: (value, content) => fileSupport.createFile(value, Buffer.from(content)),
    readFile: fileSupport.readFile, writeFile: fileSupport.writeFile,
    appendElemFromKey: () => { throw new Error('No JSON append selected') },
    showError: value => wizardEffects.errors.push(value), showWarning: value => wizardEffects.warnings.push(value), log: () => {}
  }
  await fileSupport.createDatapackCommand(wizardPorts)(wizardConfig, 'create')
  assert.equal(await fileSupport.readFile(wizardFile), '# example:load\r\nsay example')
  assert.deepEqual(JSON.parse(await fileSupport.readFile(vscode.Uri.joinPath(wizardRoot, 'pack.mcmeta'))), { pack: { pack_format: 48, description: 'Wizard fixture' } })
  assert.equal(wizardEffects.completed, 1)
  assert.deepEqual(wizardEffects.errors, [])
  await fileSupport.writeFile(wizardFile, 'keep existing')
  await fileSupport.createDatapackCommand(wizardPorts)(wizardConfig, 'create')
  assert.equal(await fileSupport.readFile(wizardFile), 'keep existing')
  const cancelledRoot = vscode.Uri.joinPath(packRoot, 'wizard-cancelled')
  await fileSupport.createDatapackCommand({ ...wizardPorts,
    selectGenerator: async () => ({ ...wizardGenerator, listenDatapackNameAndRoot: async () => ({ name: 'cancelled', root: cancelledRoot }) }),
    listenPickItem: async () => { throw new fileSupport.UserCancelledError() }
  })(wizardConfig, 'create')
  assert.equal(await fileSupport.pathAccessible(cancelledRoot), false)
  assert.deepEqual(wizardEffects.errors, [])
  assert.equal(wizardEffects.completed, 2)
  console.log('PASS datapack wizard real storage, existing-file protection and cancellation')

  const protectedOutside = vscode.Uri.joinPath(packRoot, 'wizard-outside-sentinel.txt')
  const escapedCreate = vscode.Uri.joinPath(packRoot, 'wizard-outside-created.txt')
  const escapedFolder = vscode.Uri.joinPath(packRoot, 'wizard-outside-folder')
  const protectedRoot = vscode.Uri.joinPath(packRoot, 'wizard-path-validation')
  await fileSupport.writeFile(protectedOutside, 'outside sentinel')
  const pathErrors = [], pathWarnings = []
  let pathCompleted = 0
  await fileSupport.createDatapackCommand({ ...wizardPorts,
    selectGenerator: async () => ({ ...wizardGenerator, isGeneratePackMcMeta: false, listenDatapackNameAndRoot: async () => ({ name: 'paths', root: protectedRoot }), noticeGenerated: async () => { pathCompleted++ } }),
    listenInput: async () => '../wizard-outside-created.txt',
    listenPickItem: async () => [{ label: 'Paths', generates: [
      { type: 'file', rel: '%namespace%', content: ['must not escape'] },
      { type: 'file', rel: '../wizard-outside-sentinel.txt', content: [], append: { key: '', elem: 'changed' } },
      { type: 'folder', rel: '../wizard-outside-folder/' },
      { type: 'file', rel: 'inside.txt', content: ['saved inside'] }
    ] }],
    showError: value => pathErrors.push(value), showWarning: value => pathWarnings.push(value)
  })(wizardConfig, 'create')
  assert.equal(await fileSupport.readFile(protectedOutside), 'outside sentinel')
  assert.equal(await fileSupport.pathAccessible(escapedCreate), false)
  assert.equal(await fileSupport.pathAccessible(escapedFolder), false)
  assert.equal(await fileSupport.readFile(vscode.Uri.joinPath(protectedRoot, 'inside.txt')), 'saved inside')
  assert.deepEqual(pathErrors, Array(3).fill('create-datapack-template.invalid-path'))
  assert.deepEqual(pathWarnings, ['create-datapack-template.generation-partial'])
  assert.equal(pathCompleted, 0)
  console.log('PASS wizard template paths preserve outside files and allow valid remaining files')

  const reusableTemplate = { label: '%namespace% template', generates: [{ type: 'file', rel: '%namespace%.json', content: { namespace: '%namespace%', nested: [null, { date: '%date%' }] } }] }
  const reusableConfig = { ...wizardConfig, createDatapackTemplate: { ...wizardConfig.createDatapackTemplate, customTemplate: [reusableTemplate] } }
  const originalTemplate = JSON.stringify(reusableTemplate)
  const reusableRoot = vscode.Uri.joinPath(packRoot, 'wizard-reused-config')
  for (const [namespace, date] of [['first', '2026-10-12'], ['second', '2026-10-13']]) {
    await fileSupport.createDatapackCommand({ ...wizardPorts,
      selectGenerator: async () => ({ ...wizardGenerator, isGeneratePackMcMeta: false, listenDatapackNameAndRoot: async () => ({ name: 'reused', root: reusableRoot }) }),
      listenInput: async () => namespace, getDate: () => date,
      listenPickItem: async (_placeholder, items) => { assert.equal(items[0].label, namespace + ' template'); return items }
    })(reusableConfig, 'create')
    assert.deepEqual(JSON.parse(await fileSupport.readFile(vscode.Uri.joinPath(reusableRoot, namespace + '.json'))), { namespace, nested: [null, { date }] })
    assert.equal(JSON.stringify(reusableTemplate), originalTemplate)
  }
  assert.deepEqual(wizardEffects.errors, [])
  console.log('PASS datapack wizard preserves reusable settings across real JSON writes')

  const wizardDeniedEvents = new vscode.EventEmitter()
  const wizardDenied = vscode.workspace.registerFileSystemProvider('mcdu-wizard-denied', {
    onDidChangeFile: wizardDeniedEvents.event,
    watch: () => new vscode.Disposable(() => {}),
    stat: value => { throw vscode.FileSystemError.FileNotFound(value) },
    readDirectory: value => { throw vscode.FileSystemError.FileNotFound(value) },
    readFile: value => { throw vscode.FileSystemError.FileNotFound(value) },
    createDirectory: value => { throw vscode.FileSystemError.NoPermissions(value) },
    writeFile: value => { throw vscode.FileSystemError.NoPermissions(value) },
    rename: value => { throw vscode.FileSystemError.NoPermissions(value) },
    delete: value => { throw vscode.FileSystemError.NoPermissions(value) }
  }, { isReadonly: true, isCaseSensitive: true })
  try {
    const failedEffects = { errors: [], warnings: [], completed: 0 }
    const failedRoot = wizardRoot.with({ scheme: 'mcdu-wizard-denied' })
    const failedPorts = { ...wizardPorts,
      selectGenerator: async () => ({ ...wizardGenerator, listenDatapackNameAndRoot: async () => ({ name: 'failed', root: failedRoot }), noticeGenerated: async () => { failedEffects.completed++ } }),
      showError: value => failedEffects.errors.push(value), showWarning: value => failedEffects.warnings.push(value)
    }
    await fileSupport.createDatapackCommand(failedPorts)(wizardConfig, 'create')
    assert.equal(failedEffects.completed, 0)
    assert.deepEqual(failedEffects.warnings, [])
    assert.equal(failedEffects.errors.at(-1), 'create-datapack-template.generation-failed')
    assert.equal(failedEffects.errors.length, 4) // File, data directory, metadata, summary.

    const partialRoot = vscode.Uri.joinPath(packRoot, 'wizard-partial')
    const partialEffects = { errors: [], warnings: [], completed: 0 }
    await fileSupport.createDatapackCommand({ ...wizardPorts,
      selectGenerator: async () => ({ ...wizardGenerator, isGeneratePackMcMeta: false, listenDatapackNameAndRoot: async () => ({ name: 'partial', root: partialRoot }), noticeGenerated: async () => { partialEffects.completed++ } }),
      listenPickItem: async () => [{ label: 'Mixed', generates: [
        { type: 'file', rel: 'bad.txt', content: ['denied'] },
        { type: 'file', rel: 'good.txt', content: ['saved'] }
      ] }],
      joinPath: (root, rel) => vscode.Uri.joinPath(rel === 'bad.txt' ? root.with({ scheme: 'mcdu-wizard-denied' }) : root, rel),
      showError: value => partialEffects.errors.push(value), showWarning: value => partialEffects.warnings.push(value)
    })(wizardConfig, 'add')
    assert.equal(await fileSupport.readFile(vscode.Uri.joinPath(partialRoot, 'good.txt')), 'saved')
    assert.equal(partialEffects.completed, 0)
    assert.equal(partialEffects.errors.length, 1)
    assert.deepEqual(partialEffects.warnings, ['create-datapack-template.generation-partial'])
  } finally { wizardDenied.dispose(); wizardDeniedEvents.dispose() }
  console.log('PASS wizard filesystem failures suppress completion and retain successful files')

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
