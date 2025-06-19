import * as vscode from 'vscode'

export const packTrailer = (): void => {
  const panel = vscode.window.createWebviewPanel(
    'packTrailer',
    'Datapackのコールグラフ',
    {
      viewColumn: vscode.ViewColumn.Beside
    },
    {
      enableFindWidget: true,
      enableScripts: true
    }
  )

  panel.webview.html = getWebviewContent()
}

function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
</body>
</html>`
}
