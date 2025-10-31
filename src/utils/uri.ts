import path from 'path'
import { Uri } from 'vscode'
import { Utils } from 'vscode-uri'

export class UriUtils {
  static joinPath = (uri: Uri, ...rest: string[]): Uri => Utils.joinPath(uri, ...rest)

  static dirname = (uri: Uri): Uri => Utils.dirname(uri)

  static basename = (uri: Uri): string => Utils.basename(uri)

  static extname = (uri: Uri): string => /(\.[^/.]+)$/.exec(uri.path)?.[1] ?? ''

  static relativePath = (from: Uri, to: Uri): string => path.relative(from.path, to.path)
}
