import * as vscode from 'vscode'
import { getTextEditor, showError } from '../../utils'
import { GraphSection } from './types/MermaidHelper'
import { getRelative } from './utils/accumulate'
import { CallBiMap } from './types/CallBiMap'

/*
  コールグラフを作成する機能。
  1. データパック全探索と呼び出し関係の抽出
  2. Mermaid を用いて Webview に表示
*/

export const packTrailer = (): void => {
  const currentEditor = getTextEditor(true)
  if (!currentEditor) {
    showError('現在開いているエディタがありません。')
    return
  }

  const panel = vscode.window.createWebviewPanel(
    'packTrailer',
    'Datapackのコールグラフ',
    {
      viewColumn: vscode.ViewColumn.Two,
      preserveFocus: true,
    },
    {
      enableFindWidget: true,
      enableScripts: true
    }
  )

  // const res = parseMCFunction(currentEditor.document, dispatcher, ['name'])
  
  const known : CallBiMap = new CallBiMap()
  known.register('function$main:io', 'function$callee:1')
  known.register('storage$caller:1', 'function$main:io')
  known.register('storage$caller:2', 'function$main:io')
  known.register('storage$caller:2', 'function$caller:2')
  known.register('storage$caller:3', 'function$caller:2')
  known.register('storage$caller:3', 'function$caller:3')
  known.register('function$callee:1', 'function$callee:2')
  known.register('function$callee:2', 'function$callee:3')
  panel.webview.html = getWebviewContent(getRelative(known, 'function$main:io', 2))
}

function getWebviewContent(section: GraphSection): string {
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
    mermaid.initialize({ startOnLoad: true });
  </script>
  <pre class="mermaid">
    graph LR;
      ${Array.from(section.def).join('\n')}

      ${Array.from(section.rel).join('\n')}
  </pre>
</body>
</html>`
}
