import { DocumentFormattingEditProvider, FormattingOptions, Position, Range, TextDocument, TextEdit, Uri } from 'vscode';
import { Config, getFileType, FileType } from '../types';
import { Deque, getEolString, getWorkspaceFolders, pathAccessible, walkRoot } from '../utils';
import { getDatapackRoot, getResourcePath } from '../utils/common';
import { StringReader } from '../utils/StringReader';
import fs from 'fs';
import path from 'path';
import { codeConsole } from '../extension';

export class McfunctionFormatter implements DocumentFormattingEditProvider {
    constructor(private _config: Config) { }

    set config(_config: Config) {
        this._config = _config;
    }

    async provideDocumentFormattingEdits(document: TextDocument, option: FormattingOptions): Promise<TextEdit[]> {
        console.log('[Debug] Starting Formatting');

        const indent = { isSpace: option.insertSpaces, string: option.insertSpaces ? ' '.repeat(option.tabSize) : '\t' };
        const eol = getEolString(document.eol);

        const edits: TextEdit[] = [];

        if (this._config.mcfFormatter.doInsertIMPDocument)
            edits.push(...await this.insertIMPDocument(document, indent, eol));
        edits.push(...this.insertIndent(document, indent.string, eol));

        console.log('[Debug] Finished Formatting');

        return edits;
    }

    private insertIndent(document: TextDocument, indent: string, eol: string): TextEdit[] {
        console.log('[Debug] Indentation');

        const editQueue: TextEdit[] = [];

        const depth = new Deque<number>();
        let lastLineType: 'comment' | 'blankLine' | 'special' | 'command' = 'blankLine';

        const docText = new StringReader(document.getText());

        let indents = 0;

        const next = (range: Range, line: string, _indents: number) => {
            editQueue.push(TextEdit.replace(range, indent.repeat(_indents) + line + eol));

            docText.nextLine(document);
        };

        for (let lineCount = 0; lineCount < document.lineCount; lineCount++) {
            console.log('[Debug] Indentation of line: ' + lineCount);

            docText.skipSpace();
            const lineStart = docText.cursor;
            const line = docText.readLine();
            const range = new Range(lineCount, 0, lineCount + 1, 0);

            // 改行
            if (line === '') {
                if (depth.size() > 0)
                    depth.removeLast();

                lastLineType = 'blankLine';

                next(range, '', 0);
                continue;
            }

            // StringReader#readLine() で cursor が移動してしまうため
            docText.cursor = lineStart;

            while (docText.peek() === '#') docText.skip();
            const numSigns = docText.cursor - lineStart;

            // コマンドについての処理
            if (numSigns === 0) {
                indents = depth.size();
                indents += lastLineType === 'special' ? 1 : 0;
                lastLineType = 'command';

                next(range, line, indents);
                continue;
            }

            // コメントについての処理
            switch (line.slice(docText.cursor - lineStart, line.indexOf(' '))) {
                case '': // 「# ～」や「## ～」の場合
                    if (!(lastLineType === 'comment' && numSigns === depth.getLast()))
                        // 前line の # の数を記憶し、現line と同じであれば 連続するコメント とみなす。
                        depth.addLast(numSigns);

                    indents = Math.max(depth.size() - 1, 0);
                    lastLineType = 'comment';
                    break;

                case 'declare': // 「#declare ～」「#define ～」の場合
                case 'define':
                    indents = depth.size();
                    lastLineType = 'special';
                    break;

                case '>': // 「#> ～」の場合
                    depth.clear();
                    depth.addLast(numSigns);

                    indents = 0;
                    lastLineType = 'comment';
                    break;
            }
            next(range, line, indents);
        }

        if (lastLineType === 'blankLine') editQueue.pop();

        return editQueue;
    }

    private async insertIMPDocument(document: TextDocument, indent: { isSpace: boolean, string: string }, eol: string): Promise<TextEdit[]> {
        console.log('[Debug] Insert IMP-Doc');
        
        const fileDoc: string[] = [];

        const resourcePath = await this.insertResourcePath(document, eol);
        const alreadyDoc = !resourcePath;

        if (alreadyDoc) {
            for (const line of document.getText().split(eol)) {
                if (!line.startsWith('#') || line.match(/#[(alias)|(declare)|(define)]/)) break;
                fileDoc.push((line.startsWith('# ') || line.startsWith('#>')) ? line : `# ${line.slice(1)}`);
            }
        } else {
            fileDoc.push(resourcePath ?? '');
        }

        console.log('[Debug] Within Part');
        if (!fileDoc.includes('# @within')) {
            fileDoc.push('#');
            fileDoc.push(... await this.insertUsages(document, indent, eol));
        }

        const edits: TextEdit[] = [];
        fileDoc.forEach(line => {
            edits.push(TextEdit.insert(new Position(0, 0), line));
        });
        return edits;
    }

    private async insertResourcePath(document: TextDocument, eol: string): Promise<string | undefined> {
        const rootPath = await getDatapackRoot(document.fileName);

        if (!rootPath) return undefined;

        const resourcePath = getResourcePath(document.uri.fsPath, rootPath, 'function');
        if (document.lineAt(0).text !== `#> ${resourcePath}`)
            return `#> ${resourcePath}${eol}`;

        return undefined;
    }

    private async insertUsages(document: TextDocument, indent: { isSpace: boolean, string: string }, eol: string): Promise<string[]> {
        // Copied from commands/multiLineGenerator/replacer/tags.ts
        const roots: Uri[] = [];
        const rootCandidatePaths: Set<string> = new Set();
        for (const uri of getWorkspaceFolders().map(v => v.uri)) {
            const { fsPath: fsPath } = uri;
            rootCandidatePaths.add(fsPath);
            await walkRoot(uri, fsPath, abs => rootCandidatePaths.add(abs), this._config.env.detectionDepth);
        }
        for (const candidatePath of rootCandidatePaths) {
            if (await pathAccessible(path.join(candidatePath, 'data')) && await pathAccessible(path.join(candidatePath, 'pack.mcmeta'))) {
                const uriString = Uri.file(candidatePath).toString();
                roots.push(Uri.parse(uriString[uriString.length - 1] !== '/' ? `${uriString}/` : uriString));
            }
        }
        // End Coping

        console.log('[Debug] Root defined');

        // Directory階層ごとに再帰する実装
        const walk = (absolutePath: string, datapackRoot: string, target: string, _usages: typeof usages): typeof usages => {
            for (const dir of fs.readdirSync(absolutePath)) {
                const newAbs = path.join(absolutePath, dir);
                const stat = fs.statSync(newAbs);

                console.log('[Debug] Walk on ' + newAbs);

                // 下の階層へ。戻ってきたら、continue
                if (stat.isDirectory()) walk(newAbs, datapackRoot, target, _usages);
                if (!stat.isFile()) continue;

                // 関係のなさそうなファイルはスキップ
                const fileType = getFileType(newAbs, datapackRoot);
                if (!fileType) continue;
                // 初期化
                if (!_usages[fileType]) _usages[fileType] = [];

                // TODO とりあえず、何らかの形で記述されている場合。要絞り込み
                if (fs.readFileSync(newAbs).includes(target))
                    _usages[fileType]?.push(getResourcePath(newAbs, datapackRoot));
            }
            return _usages;
        };

        let usages: { [T in FileType]?: string[] } = {};

        for (const datapackRoot of roots.map(v => v.toString())) {
            const resourcePath = getResourcePath(document.uri.fsPath, datapackRoot, 'function');
            usages = walk(datapackRoot, datapackRoot, resourcePath, usages);
        }

        if (usages === {}) return [];

        console.log('[Debug] Found any Usages');

        const withins: string[] = [];
        withins.push(`# @within${eol}`);
        
        for (const key of Object.keys(usages) as FileType[]) {
            if (usages[key]?.length === 0) continue;

            usages[key]?.sort();
            withins.push(this.indentedComment(key, indent, eol));

            (usages[key] ?? []).forEach(v => withins.push(this.indentedComment(v, indent, eol, 2)));
        }

        return withins;
    }

    private indentedComment(text: string, indent: { isSpace: boolean, string: string }, eol: string, depth?: number): string {
        if (depth === undefined || depth <= 0) depth = 1;

        const commentHead = indent.isSpace && indent.string.length > 2 ? indent.string.slice(2) : indent;

        return `# ${commentHead}${indent.string.repeat(depth - 1)}${text}${eol}`;
    }
}