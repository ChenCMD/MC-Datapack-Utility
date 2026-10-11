import assert from 'node:assert/strict'
import { mkdtemp, stat, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
const fileModule = fileURLToPath(new URL('../src/utils/file.ts', import.meta.url))
const { createFile, workspace } = await bundledExports('storage-test', {
  'storage-test': `export {createFile} from ${JSON.stringify(fileModule)}; export {workspace} from 'vscode';`,
  vscode: `export const workspace = {fs:{}};export const FileType = {Directory:2};
    export const FileSystemError = {FileExists:uri=>Object.assign(new Error(uri.path),{code:'FileExists'})};`
})
async function withStorage(run) {
  const directory = await mkdtemp(join(tmpdir(),'mcdu-file-storage-'))
  const uri = {path:join(directory,'sample.mcfunction')}
  workspace.fs = {stat:u=>stat(u.path),writeFile:(u,bytes)=>writeFile(u.path,bytes)}
  try {await run(uri)} finally {await rm(directory,{recursive:true,force:true});workspace.fs={}}
}
test('the production storage helper preserves UTF-8 bytes when creating a file', async()=>{
  await withStorage(async uri=>{
    const bytes=Buffer.from('say 日本語\r\n')
    await createFile(uri,bytes)
    assert.deepEqual(await readFile(uri.path),bytes)
  })
})
test('the production storage helper rejects an existing file without changing it', async()=>{
  await withStorage(async uri=>{
    await writeFile(uri.path,'keep original')
    await assert.rejects(createFile(uri,Buffer.from('replacement')), {code:'FileExists'})
    assert.equal(await readFile(uri.path,'utf8'),'keep original')
  })
})
test('the production storage helper propagates a provider write failure', async()=>{
  await withStorage(async uri=>{
    workspace.fs.writeFile=async()=>{throw new Error('Provider denied write')}
    await assert.rejects(createFile(uri,Buffer.from('content')), /Provider denied write/)
    await assert.rejects(stat(uri.path),{code:'ENOENT'})
  })
})
