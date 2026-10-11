import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { bundledExports } from './test-helpers.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const shared = `
  import { promises as fs } from 'node:fs';
  import path from 'node:path';
  import { UserCancelledError, NotOpenTextDocumentError } from ${JSON.stringify(root + 'src/types/Error.ts')};
  export const state = {};
  export const uri = p => ({path:p,fsPath:p});
  export const joinPath = (u,...rest) => uri(path.join(u.path,...rest));
  export const basename = u => path.basename(u.path);
  export const dirname = u => uri(path.dirname(u.path));
  export const pathAccessible = async u => fs.stat(u.path).then(()=>true,()=>false);
  export const createFile = async (u,bytes) => {
    state.writes.push(u.path);
    if(await pathAccessible(u)) throw new Error('File already exists');
    if(state.failWrite) throw new Error('Storage unavailable');
    await fs.writeFile(u.path,bytes);
  };
  export const getDatapackRoot = async () => state.outside ? undefined : uri(state.root);
  export const getPackFormat = async () => 7;
  export const getFileType = () => state.unknownType ? undefined : state.type || 'function';
  export const isDatapackRoot = async () => true;
  export const getDate = () => '2026-10-11';
  export const getNamespace = () => 'example';
  export const getResourcePath = u => 'example:'+path.basename(u.path,path.extname(u.path));
  export const getTextEditor = () => {
    if(!state.activeFile) throw new NotOpenTextDocumentError();
    return {document:{uri:uri(state.activeFile)}};
  };
  export const listenInput = async (_message,validate) => {
    state.prompts++;
    if(state.cancel) throw new UserCancelledError();
    const error = await validate(state.name);
    if(error) {state.validation=error;throw new UserCancelledError();}
    return state.name;
  };
  export const showError = async (message,_modal,items) => {
    if(items) {state.confirmations++; if(state.decline)throw new UserCancelledError();return 'yes';}
    state.errors.push(message);
  };
  export const createDatapack = async (_config,mode) => state.datapacks.push(mode);
  export const locale = (key,...params) => [key,...params].join(':');
  export const codeConsole = {appendLine:message=>state.logs.push(message)};
  export class Range {constructor(...position){this.position=position}}
  export const window = {showTextDocument:async (u,options)=>state.opened.push({path:u.path,options})};
`
const stubs = { 'test-shared': shared, 'test-entry': `
  export {createFile} from ${JSON.stringify(root + 'src/commands/createFile/main.ts')};
  export {state,uri} from 'test-shared';`,
  vscode: `export {Range,window} from 'test-shared';`,
  '../../utils/file': `export {pathAccessible,createFile} from 'test-shared';`,
  '../../utils/common': `export {getDatapackRoot,getDate,getNamespace,getPackFormat,getResourcePath,isDatapackRoot} from 'test-shared';`,
  '../../utils/vscodeWrapper': `export {getTextEditor,listenInput,showError} from 'test-shared';`,
  '../../utils/uri': `import {joinPath,basename,dirname} from 'test-shared';export const UriUtils={joinPath,basename,dirname};`,
  '../../locales': `export {locale} from 'test-shared';`,
  '../../extension': `export {codeConsole} from 'test-shared';`,
  '../../types/FileTypes': `export {getFileType} from 'test-shared';`,
  '../../types/MessageItemHasId': `export const createMessageItemHasIds = (...ids)=>ids.map(id=>({id,title:id}));`,
  '../createDatapackTemplate/main': `export {createDatapack} from 'test-shared';`
}
const { createFile, state, uri } = await bundledExports('test-entry', stubs)
const config = {env:{dateFormat:'yyyy-mm-dd'},createFile:{fileTemplate:{function:['# %fileResourcePath% %date%','say %fileName%','%cursor%'],recipe:['{"name":"%fileName%"}']}}}
async function withPack(overrides, run) {
  const root = await mkdtemp(join(tmpdir(), 'mcdu-create-file-'))
  const directory = join(root, 'data/example/functions')
  await mkdir(directory,{recursive:true})
  Object.assign(state,{root,name:'sample',prompts:0,writes:[],opened:[],errors:[],logs:[],datapacks:[],confirmations:0,cancel:false,decline:false,outside:false,type:'function',unknownType:false,failWrite:false,activeFile:undefined,validation:undefined},overrides)
  try {await run(directory)} finally {await rm(root,{recursive:true,force:true})}
}
test('create command writes expanded UTF-8 template and opens the created file', async () => {
  await withPack({},async directory=>{
    await createFile(uri(directory),config)
    assert.equal(await readFile(join(directory,'sample.mcfunction'),'utf8'),'# example:sample 2026-10-11\r\nsay sample\r\n')
    assert.equal(state.opened.length,1)
    assert.equal(state.opened[0].path,join(directory,'sample.mcfunction'))
    assert.deepEqual(state.opened[0].options.selection.position,[2,0,2,0])
    assert.deepEqual(state.errors,[])
  })
})
test('filename cancellation creates no file and reports no error', async () => {
  await withPack({cancel:true},async directory=>{
    await createFile(uri(directory),config)
    assert.deepEqual(state.writes,[]);assert.deepEqual(state.opened,[]);assert.deepEqual(state.errors,[])
    await assert.rejects(access(join(directory,'sample.mcfunction')))
  })
})
test('existing files are rejected by validation and retain their bytes', async () => {
  await withPack({},async directory=>{
    const file=join(directory,'sample.mcfunction');await writeFile(file,'keep this content')
    await createFile(uri(directory),config)
    assert.equal(await readFile(file,'utf8'),'keep this content')
    assert.match(state.validation,/error.already-exists/)
    assert.deepEqual(state.writes,[]);assert.deepEqual(state.opened,[])
  })
})
test('invalid names do not reach storage', async () => {
  await withPack({name:'Bad Name'},async directory=>{
    await createFile(uri(directory),config)
    assert.match(state.validation,/unexpected-character/);assert.deepEqual(state.writes,[])
  })
})

test('empty, absolute, and dot-segment names do not reach storage', async () => {
  for (const name of ['', '.', '..', '../escape', 'nested/../../escape', './sample',
    '/absolute', 'nested/', 'nested//sample', 'nested/./sample', 'nested/../sample']) {
    await withPack({ name }, async directory => {
      await createFile(uri(directory), config)
      assert.match(state.validation, /error.invalid-file-name/, name)
      assert.deepEqual(state.writes, [], name)
      assert.deepEqual(state.opened, [], name)
    })
  }
})
test('nested resource names with dots, underscores, and hyphens are supported', async () => {
  await withPack({ name: 'nested/a.b-c_d' }, async directory => {
    await mkdir(join(directory, 'nested'))
    await createFile(uri(directory), config)
    assert.equal(state.validation, undefined)
    assert.equal(await readFile(join(directory, 'nested/a.b-c_d.mcfunction'), 'utf8'),
      '# example:a.b-c_d 2026-10-11\r\nsay nested/a.b-c_d\r\n')
    assert.equal(state.opened.length, 1)
  })
})
test('write failure is reported and the file is not opened', async () => {
  await withPack({failWrite:true},async directory=>{
    await createFile(uri(directory),config)
    assert.deepEqual(state.errors,['Storage unavailable']);assert.equal(state.logs.length,1);assert.deepEqual(state.opened,[])
    await assert.rejects(access(join(directory,'sample.mcfunction')))
  })
})
test('declining datapack creation makes no changes', async () => {
  await withPack({outside:true,decline:true},async directory=>{
    await createFile(uri(directory),config)
    assert.equal(state.confirmations,1);assert.equal(state.prompts,0);assert.deepEqual(state.datapacks,[]);assert.deepEqual(state.writes,[])
  })
})
test('accepting datapack creation delegates without writing a resource file', async () => {
  await withPack({outside:true},async directory=>{
    await createFile(uri(directory),config)
    assert.deepEqual(state.datapacks,['create']);assert.deepEqual(state.writes,[])
  })
})
test('structure creation is rejected before filename input', async () => {
  await withPack({type:'structure'},async directory=>{
    await createFile(uri(directory),config)
    assert.deepEqual(state.errors,['create-file.structure']);assert.equal(state.prompts,0);assert.deepEqual(state.writes,[])
  })
})

test('unknown folder type delegates to datapack setup without writing', async () => {
  await withPack({unknownType:true},async directory=>{
    await createFile(uri(directory),config)
    assert.deepEqual(state.datapacks,['add']);assert.equal(state.prompts,0);assert.deepEqual(state.writes,[])
  })
})
test('active file variables expand without changing the active source file', async () => {
  await withPack({},async directory=>{
    const active=join(directory,'active.mcfunction');await writeFile(active,'keep active')
    state.activeFile=active
    const settings={...config,createFile:{fileTemplate:{function:['%nowOpenFileName% %nowOpenFileExtname% %nowOpenFileResourcePath%']}}}
    await createFile(uri(directory),settings)
    assert.equal(await readFile(join(directory,'sample.mcfunction'),'utf8'),'active mcfunction example:active')
    assert.equal(await readFile(active,'utf8'),'keep active')
  })
})
test('JSON resource creation uses the json extension', async () => {
  await withPack({type:'recipe'},async directory=>{
    await createFile(uri(directory),config)
    assert.equal(await readFile(join(directory,'sample.json'),'utf8'),'{"name":"sample"}')
    assert.equal(state.opened[0].path,join(directory,'sample.json'))
  })
})

test('the command core loads without VS Code or extension initialization', async () => {
  const { createFileCommand } = await bundledExports('src/commands/createFile/core/command.ts')
  const command = createFileCommand({
    getDatapackRoot: async () => undefined, confirmDatapack: async () => 'no',
    locale: key => key, showError: message => assert.fail(message), log: message => assert.fail(message)
  })
  assert.equal(await command({path:'/outside'},config),undefined)
})
