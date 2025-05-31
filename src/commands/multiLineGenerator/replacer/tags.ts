import path from 'path';
import { Uri } from 'vscode';
import { locale } from '../../../locales';
import { makeExtendQuickPickItem, tagFileTypes } from '../../../types';
import { Tags } from '../../../types/Tags';
import { getWorkspaceFolders, listenInput, listenPickItem, pathAccessible, readFile, walkRoot } from '../../../utils';
import { asyncFilter, asyncMap, asyncSome } from '../../../utils/asyncUtil';
import { Replacer } from '../types/Replacer';

const tagTypesMap = Object.fromEntries(tagFileTypes.map(v => [v, v]));

export const tagsReplacer: Replacer = async (insertString, _insertCount, { config: ctx }) => {
    const roots: Uri[] = [];
    const rootCandidatePaths: Set<string> = new Set();
    for (const uri of getWorkspaceFolders().map(v => v.uri)) {
        const { fsPath: fsPath } = uri;
        rootCandidatePaths.add(fsPath);
        await walkRoot(uri, fsPath, abs => rootCandidatePaths.add(abs), ctx.env.detectionDepth);
    }
    for (const candidatePath of rootCandidatePaths) {
        if (await pathAccessible(path.join(candidatePath, 'data')) && await pathAccessible(path.join(candidatePath, 'pack.mcmeta'))) {
            const uriString = Uri.file(candidatePath).toString();
            roots.push(Uri.parse(uriString[uriString.length - 1] !== '/' ? `${uriString}/` : uriString));
        }
    }

    const { extend: tagType } = await listenPickItem(locale('tags.tag-type'), makeExtendQuickPickItem(tagTypesMap, false), false);
    const makeFilePaths = (resourcePath: string) => {
        const [, namespace, file] = resourcePath.match(/^(?:([^:]*):)?(.+)$/) ?? [];
        return roots.map(root => Uri.joinPath(root, 'data', namespace || 'minecraft', tagType, `${file}.json`));
    };
    const tag = await listenInput(locale('tags.tags'), async v => {
        if (v === '') return locale('error.input-blank', locale('tags.tags'));
        if (!await asyncSome(makeFilePaths(v), pathAccessible)) return locale('error.not-exist', locale('tags.tags'), v);
        return undefined;
    });

    let matchFiles = (await asyncFilter(makeFilePaths(tag), pathAccessible)).map(v => v.fsPath);
    if (matchFiles.length >= 2) {
        const res = await listenPickItem(locale('tags.multiple-tags-found'), matchFiles.map(v => ({ label: v })));
        matchFiles = res.map(v => v.label);
    }

    const ans: string[] = [];
    for (const value of (await asyncMap<string, Tags>(matchFiles, async v => JSON.parse(await readFile(v)))).flatMap(v => v.values))
        ans.push(insertString.replace(/%r/g, typeof value === 'string' ? value : value.id));
    return ans;
};