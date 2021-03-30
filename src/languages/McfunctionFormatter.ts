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

        const indentElement = { newLineSign: '\n', indents: 0 };

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

                next(range, '', { newLineSign: '\n', indents: 0 });
                continue;
            }

            // StringReader#readLine() で cursor が移動してしまうため
            docText.cursor = lineStart;

            while (docText.peek() === '#') docText.skip();
            const numSigns = docText.cursor - lineStart;

            indentElement.newLineSign = '\n';

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

                    indentElement.newLineSign += lastLineType === 'command' ? '\n' : '';
                    indentElement.indents = Math.max(depth.size() - 1, 0);
                    lastLineType = 'comment';
                    break;

                case 'declare': // 「#declare ～」「#define ～」の場合
                case 'define':
                    indentElement.newLineSign += lastLineType === 'command' ? '\n' : '';
                    indentElement.indents = depth.size();
                    lastLineType = 'special';
                    break;

                case '>':
                    depth.clear();
                    depth.addLast(numSigns);
                    
                    indentElement.newLineSign = lineCount === 0 ? '' : '\n';
                    indentElement.newLineSign += lastLineType === 'command' ? '\n' : '';
                    indentElement.indents = 0;
                    lastLineType = 'comment';
                    break;
            }
            next(range, line, indentElement);
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
