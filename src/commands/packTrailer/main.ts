import * as vscode from 'vscode'
import { getTextEditor, showError } from '../../utils'
import { GraphSection } from './types/MermaidHelper'
import { getRelative } from './utils/accumulate'
import { CallBiMap } from './types/CallBiMap'

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
  
  const known : CallBiMap = new CallBiMap()
  panel.webview.html = getWebviewContent(getRelative(known, 'minecraft:function$main:io', 2))
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
    graph LR
      ${Array.from(section.def).join('\n')}

      ${Array.from(section.rel).join('\n')}

      linkStyle default stroke: white
  </pre>
</body>
</html>`
}
