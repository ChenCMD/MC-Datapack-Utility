import { Uri } from 'vscode'
import { locale } from '../../../locales'
import { makeExtendQuickPickItem, tagFileTypes } from '../../../types'
import { Tags } from '../../../types/Tags'
import { getWorkspaceFolders, listenInput, listenPickItem, pathAccessible, readFile, walkRoot } from '../../../utils'
import { asyncFilter, asyncMap, asyncSome } from '../../../utils/asyncUtil'
import { Replacer } from '../types/Replacer'
import { UriUtils } from '../../../utils/uri'

const tagTypesMap = Object.fromEntries(tagFileTypes.map(v => [v, v]))

export const tagsReplacer: Replacer = async (insertString, _insertCount, { config: ctx }) => {
  const roots: Uri[] = []
  const rootCandidateUris: Set<Uri> = new Set()
  for (const uri of getWorkspaceFolders().map(v => v.uri)) {
    rootCandidateUris.add(uri)
    await walkRoot(uri, abs => rootCandidateUris.add(abs), ctx.env.detectionDepth)
  }
  for (const candidateUri of rootCandidateUris) {
    if (await pathAccessible(UriUtils.joinPath(candidateUri, 'data')) && await pathAccessible(UriUtils.joinPath(candidateUri, 'pack.mcmeta'))) {
      const uriString = candidateUri.toString()
      roots.push(Uri.parse(uriString[uriString.length - 1] !== '/' ? `${uriString}/` : uriString))
    }
  }

  const { extend: tagType } = await listenPickItem(locale('tags.tag-type'), makeExtendQuickPickItem(tagTypesMap, false), false)
  const makeFileUris = (resourcePath: string) => {
    const [, namespace, file] = resourcePath.match(/^(?:([^:]*):)?(.+)$/) ?? []
    return roots.map(root => Uri.joinPath(root, 'data', namespace || 'minecraft', tagType, `${file}.json`))
  }
  const tag = await listenInput(locale('tags.tags'), async v => {
    if (v === '') return locale('error.input-blank', locale('tags.tags'))
    if (!await asyncSome(makeFileUris(v), pathAccessible)) return locale('error.not-exist', locale('tags.tags'), v)
    return undefined
  })

  let matchFiles = (await asyncFilter(makeFileUris(tag), pathAccessible))
  if (matchFiles.length >= 2) {
    const res = await listenPickItem(locale('tags.multiple-tags-found'), matchFiles.map(v => ({ label: v.fsPath, extra: v })))
    matchFiles = res.map(v => v.extra)
  }

  const ans: string[] = []
  for (const value of (await asyncMap<Uri, Tags>(matchFiles, async v => JSON.parse(await readFile(v)))).flatMap(v => v.values))
    ans.push(insertString.replace(/%r/g, typeof value === 'string' ? value : value.id))
  return ans
}
