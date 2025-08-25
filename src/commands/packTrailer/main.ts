import * as vscode from 'vscode'
import { getDatapackRoot, getPackFormat, getResourcePath, getTextEditor, pathAccessible, readFile, showError } from '../../utils'
import { Graph } from './types/MermaidHelper'
import { CallBiMap, getRelative, register } from './types/CallBiMap'
import { CallPair, makeCallNode } from './types/CallNode'
import { FileType, getFilePath, getFileType, getFileTypeDirs } from '../../types'
import { parseFile } from './parsers'

export async function packTrailer(subscriptions: vscode.Disposable[]): Promise<void> {
  const currentEditor = getTextEditor(true)
  if (!currentEditor) {
    showError('現在開いているエディタがありません。')
    return
  }
  const currentViewColumn = currentEditor.viewColumn
  
  const datapackRoot = await getDatapackRoot(currentEditor.document.uri.fsPath)
  if (!datapackRoot) {
    showError('Datapack 内のファイルを開いてください。')
    return
  }
  const packFormat = await getPackFormat(datapackRoot)

  const callMap = await crawlOnRoot(datapackRoot, packFormat)

  const fileType = getFileType(currentEditor.document.uri.fsPath, datapackRoot, packFormat)
  if (!fileType) {
    showError('不明なファイルタイプです。')
    return
  }
  const resourceLocation = getResourcePath(currentEditor.document.uri.fsPath, datapackRoot, packFormat, fileType)
  const rootNode = makeCallNode(fileType, resourceLocation)
  const graph = getRelative(callMap, rootNode, 2)

  const panel = vscode.window.createWebviewPanel(
    'packTrailer',
    'Datapackのコールグラフ',
    { viewColumn: vscode.ViewColumn.Beside },
    { enableScripts: true }
  )

  panel.webview.html = getWebviewContent(graph)

  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'jump') {
      const [, type, namespace, path] = (message.id as string).match(/([^$]+)\$([^:]+):(.+)/) ?? []
      const postfix = type === 'function' ? 'mcfunction' : 'json'
      const uri = vscode.Uri.file(`${datapackRoot}/data/${namespace}/${getFilePath(type as FileType, packFormat)}/${path}.${postfix}`)
      console.log(uri.toString())
      await vscode.window.showTextDocument(
        await vscode.workspace.openTextDocument(uri),
        currentViewColumn
      )
    }
  }, undefined, subscriptions)
  console.log(panel.webview.html)
}

function getWebviewContent(graph: Graph): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Datapack Trailer</title>
</head>
<body>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, securityLevel: 'loose' });

    const vscode = acquireVsCodeApi();

    window.callback = function (id) {
      vscode.postMessage({ command: 'jump', id });
    };
  </script>
  <pre class="mermaid">
    flowchart LR
      ${Array.from(graph.def).join('\n      ')}

      ${Array.from(graph.rel).join('\n      ')}

      ${Array.from(graph.click).join('\n      ')}

      linkStyle default stroke: white
  </pre>
</body>
</html>`
}

async function crawlOnRoot(datapackRoot: string, packFormat: number) : Promise<CallBiMap> {
  const map: CallBiMap = { ofFrom: {}, ofTo: {} }

  const root = vscode.Uri.file(datapackRoot)
  const data = vscode.Uri.joinPath(root, 'data')
  for (const [namespace, info] of await vscode.workspace.fs.readDirectory(data)) {
    if (info !== vscode.FileType.Directory) continue

    for (const [fc, typeDir] of getFileTypeDirs(packFormat)) {
      const dir = vscode.Uri.joinPath(data, namespace, typeDir)
      if (!await pathAccessible(dir)) continue

      register(map, ...await crawlWithFileType(dir, fc, `${namespace}:`))
    }
  }

  return map
}

async function crawlWithFileType(dir: vscode.Uri, ft: FileType, resourceLocation: string): Promise<CallPair[]> {
  const accum : CallPair[] = []

  for (const [e, info] of await vscode.workspace.fs.readDirectory(dir)) {
    if (info === vscode.FileType.File) {
      const from = makeCallNode(ft, `${resourceLocation}${e.substring(0, e.lastIndexOf('.'))}`)

      accum.push(...parseFile(await readFile(vscode.Uri.joinPath(dir, e)), ft)
        .map(to => ({ from, to }))
      )
      continue
    }
    if (info === vscode.FileType.Directory) {
      accum.push(...await crawlWithFileType(vscode.Uri.joinPath(dir, e), ft, `${resourceLocation}${e}/`))
      continue
    }
  }

  return accum
}
