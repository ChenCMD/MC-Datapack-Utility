import * as vscode from 'vscode'
import { getTextEditor, showError } from '../../utils'

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
  
  panel.webview.html = getWebviewContent('hi')
}

function getWebviewContent(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Datapack Trailer</title>
</head>
<body>
  <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
  ${body}
</body>
</html>`
}
