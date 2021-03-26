import { DocumentFormattingEditProvider, FormattingOptions, Position, Range, TextDocument, TextEdit } from 'vscode';
import { config } from '../extension';
import { Deque } from '../types/Deque';
import { getDatapackRoot, getResourcePath } from '../utils/common';
import { StringReader } from '../utils/StringReader';

export class McfunctionFormatter implements DocumentFormattingEditProvider {
    async provideDocumentFormattingEdits(document: TextDocument, option: FormattingOptions): Promise<TextEdit[]> {
        const indent = option.insertSpaces ? ' '.repeat(option.tabSize) : '\t';
        return [...await this.insertProtocol(document), ...this.insertIndent(document, indent)];
    }

    private insertIndent(document: TextDocument, indent: string): TextEdit[] {
        const editQueue: TextEdit[] = [];

        const depth = new Deque<number>();
        let lastLineType: 'comment' | 'blankLine' | 'special' | 'command' = 'blankLine';

        const docText = new StringReader(document.getText());

        for (let lineCount = 0; lineCount < document.lineCount; lineCount++) {
            docText.skipSpace();
            const lineStart = docText.cursor;
            const line = docText.readLine();
            const range = new Range(new Position(lineCount, 0), new Position(lineCount + 1, 0));

            // 改行
            if (line === '') {
                if (depth.size() > 0)
                    depth.removeLast();
                editQueue.push(TextEdit.replace(range, '\n'));
                lastLineType = 'blankLine';
                docText.nextLine(document);
                continue;
            }

            docText.cursor = lineStart;

            while (docText.peek() === '#') docText.skip();
            const numSigns = docText.cursor - lineStart;

            // コマンドについての処理
            if (numSigns === 0) {
                editQueue.push(TextEdit.replace(range, `\n${indent.repeat(depth.size())}${lastLineType === 'special' ? indent : ''}${line}`));
                lastLineType = 'command';
                docText.nextLine(document);
                continue;
            }

            // コメントについての処理
            switch (line.slice(docText.cursor - lineStart, line.indexOf(' '))) {
                case '':
                    // 「# ～」や「## ～」の場合
                    if (!(lastLineType === 'comment' && numSigns === depth.getLast()))
                        // 前line の # の数を記憶し、現line と同じであれば 連続するコメント とみなす。
                        depth.addLast(numSigns);
                    editQueue.push(TextEdit.replace(range, `\n${lastLineType === 'command' ? '\n' : ''}${indent.repeat(Math.max(depth.size() - 1, 0))}${line}`));
                    lastLineType = 'comment';
                    break;

                case 'declare':
                case 'define':
                    // 「#declare ～」「#define ～」の場合
                    editQueue.push(TextEdit.replace(range, `\n${lastLineType === 'command' ? '\n' : ''}${indent.repeat(depth.size())}${line}`));
                    lastLineType = 'special';
                    break;

                case '>':
                    editQueue.push(TextEdit.replace(range, `${lineCount === 0 ? '' : '\n'}${lastLineType === 'command' ? '\n' : ''}${line}`));
                    depth.clear();
                    depth.addLast(numSigns);
                    lastLineType = 'comment';
                    break;
            }
            docText.nextLine(document);
        }

        return editQueue;
    }

    private async insertProtocol(document: TextDocument): Promise<TextEdit[]> {
        if (!config.mcfFormatter.doInsertIMPDocument)
            return [];
        
        const rootPath = await getDatapackRoot(document.fileName);

        if (rootPath) {
            const filepath = getResourcePath(document.uri.fsPath, rootPath, 'function');
            if (document.lineAt(0).text !== `#> ${filepath}`)
                return [TextEdit.insert(new Position(0, 0), `#> ${filepath}\n`)];
        }

        return [];
    }
}