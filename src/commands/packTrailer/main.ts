import { getDatapackRoot, getPackFormat, getTextEditor, pathAccessible, readFile, showError } from '../../utils'
import { Graph, makeGraph } from './types/MermaidHelper'
import { CallJungle, makeCallJungle, makeCallNode } from './types/CallNode'
import { FileType, getFilePath, getFileTypeDirs } from '../../types'
import { parseFile } from './parsers'
import { Disposable, window, ViewColumn, Uri, workspace, FileType as FileInfo } from 'vscode'

export async function packTrailer(subscriptions: Disposable[]): Promise<void> {
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
  const graph = makeGraph(await crawlOnRoot(datapackRoot, packFormat))

  const panel = window.createWebviewPanel(
    'packTrailer',
    'Datapackのコールグラフ',
    { viewColumn: ViewColumn.Beside },
    { enableScripts: true }
  )

  panel.webview.html = getWebviewContent(graph)
  console.log(panel.webview.html)
  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'jump') {
      const [, type, namespace, path] = (message.id as string).match(/[^!]*!([^$]+)\$#?([^:]+):(.+)/) ?? ['', '', '', '']
      const postfix = type === 'function' ? 'mcfunction' : 'json'
      const uri = Uri.file(`${datapackRoot}/data/${namespace}/${getFilePath(type as FileType, packFormat)}/${path}.${postfix}`)

      await window.showTextDocument(
        await workspace.openTextDocument(uri),
        currentViewColumn
      )
    }
  }, undefined, subscriptions)
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
      ${Array.from(graph.def).join('\n')}

      ${Array.from(graph.rel).join('\n')}

      ${Array.from(graph.click).join('\n')}

      linkStyle default stroke: cyan
  </pre>
</body>
</html>`
}

async function crawlOnRoot(datapackRoot: string, packFormat: number) : Promise<CallJungle> {
  const jungle = makeCallJungle()

  const root = Uri.file(datapackRoot)
  const data = Uri.joinPath(root, 'data')
  for (const [namespace, info] of await workspace.fs.readDirectory(data)) {
    if (info !== FileInfo.Directory) continue

    for (const [fc, typeDir] of getFileTypeDirs(packFormat)) {
      const dir = Uri.joinPath(data, namespace, typeDir)
      if (!await pathAccessible(dir)) continue

      jungle.join(await crawlWithFileType(dir, fc, `${namespace}:`))
    }
  }

  return jungle
}

async function crawlWithFileType(dir: Uri, ft: FileType, resourceLocation: string): Promise<CallJungle> {
  const jungle = makeCallJungle()

  for (const [e, info] of await workspace.fs.readDirectory(dir)) {
    if (info === FileInfo.File) {
      jungle.join(parseFile(
        await readFile(Uri.joinPath(dir, e)), ft,
        makeCallNode(ft, `${resourceLocation}${e.substring(0, e.lastIndexOf('.'))}`)
      ))
      continue
    }
    if (info === FileInfo.Directory) {
      jungle.join(await crawlWithFileType(Uri.joinPath(dir, e), ft, `${resourceLocation}${e}/`))
      continue
    }
  }

  return jungle
}
