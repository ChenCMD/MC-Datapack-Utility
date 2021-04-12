import { DocumentFormattingEditProvider, EndOfLine, FormattingOptions, Position, Range, TextDocument, TextEdit } from 'vscode';
import { config } from '../extension';
import { Deque } from '../types/Deque';
import { getDatapackRoot, getResourcePath } from '../utils/common';
import { StringReader } from '../utils/StringReader';

export class McfunctionFormatter implements DocumentFormattingEditProvider {
    async provideDocumentFormattingEdits(document: TextDocument, option: FormattingOptions): Promise<TextEdit[]> {
        const indent = option.insertSpaces ? ' '.repeat(option.tabSize) : '\t';
        const eol = (() => {
            switch (document.eol) {
                case EndOfLine.LF: return '\n';
                case EndOfLine.CRLF: return '\r\n';
            }
        })();

        const edits: TextEdit[] = [];

        if (!config.mcfFormatter.doInsertIMPDocument) {
            const protocol = await this.insertResourcePath(document, eol);
            if (protocol)
                edits.push(protocol);
        }
        edits.push(...this.insertIndent(document, indent, eol));

        return edits;
    }

    private insertIndent(document: TextDocument, indent: string, eol: string): TextEdit[] {
        const editQueue: TextEdit[] = [];

        const depth = new Deque<number>();
        let lastLineType: 'comment' | 'blankLine' | 'special' | 'command' = 'blankLine';

        const docText = new StringReader(document.getText());

        const indentElement = { newLineSign: eol, indents: 0 };

        const next = (range: Range, line: string, indentMap: typeof indentElement) => {
            editQueue.push(TextEdit.replace(range, indentMap.newLineSign + indent.repeat(indentMap.indents) + line));

            docText.nextLine(document);
        };

        for (let lineCount = 0; lineCount < document.lineCount; lineCount++) {
            docText.skipSpace();
            const lineStart = docText.cursor;
            const line = docText.readLine();
            const range = new Range(lineCount, 0, lineCount + 1, 0);

            // 改行
            if (line === '') {
                if (depth.size() > 0)
                    depth.removeLast();

                lastLineType = 'blankLine';

                next(range, '', { newLineSign: eol, indents: 0 });
                continue;
            }

            // StringReader#readLine() で cursor が移動してしまうため
            docText.cursor = lineStart;

            while (docText.peek() === '#') docText.skip();
            const numSigns = docText.cursor - lineStart;

            indentElement.newLineSign = eol;

            // コマンドについての処理
            if (numSigns === 0) {
                indentElement.indents = depth.size();
                indentElement.indents += lastLineType === 'special' ? 1 : 0;

                lastLineType = 'command';

                next(range, line, indentElement);
                continue;
            }

            // コメントについての処理
            switch (line.slice(docText.cursor - lineStart, line.indexOf(' '))) {
                case '': // 「# ～」や「## ～」の場合
                    if (!(lastLineType === 'comment' && numSigns === depth.getLast()))
                        // 前line の # の数を記憶し、現line と同じであれば 連続するコメント とみなす。
                        depth.addLast(numSigns);

                    indentElement.newLineSign += lastLineType === 'command' ? eol : '';
                    indentElement.indents = Math.max(depth.size() - 1, 0);
                    lastLineType = 'comment';
                    break;

                case 'declare': // 「#declare ～」「#define ～」の場合
                case 'define':
                    indentElement.newLineSign += lastLineType === 'command' ? eol : '';
                    indentElement.indents = depth.size();
                    lastLineType = 'special';
                    break;

                case '>':
                    depth.clear();
                    depth.addLast(numSigns);

                    indentElement.newLineSign = lineCount === 0 ? '' : eol;
                    indentElement.newLineSign += lastLineType === 'command' ? eol : '';
                    indentElement.indents = 0;
                    lastLineType = 'comment';
                    break;
            }
            next(range, line, indentElement);
        }

        return editQueue;
    }

    private async insertResourcePath(document: TextDocument, eol: string): Promise<TextEdit | undefined> {
        const rootPath = await getDatapackRoot(document.fileName);

        if (rootPath) {
            const resourcePath = getResourcePath(document.uri.fsPath, rootPath, 'function');
            if (document.lineAt(0).text !== `#> ${resourcePath}`)
                return TextEdit.insert(new Position(0, 0), `#> ${resourcePath}${eol}`);
        }

        return undefined;
    }
}