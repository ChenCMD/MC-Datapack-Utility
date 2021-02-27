import { DocumentFormattingEditProvider, FormattingOptions, ProviderResult, TextDocument, TextEdit } from 'vscode';
import { StringReader } from '../utils/StringReader';

export class McfunctionFormatter implements DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: TextDocument, option: FormattingOptions): ProviderResult<TextEdit[]> {
        const indent = option.insertSpaces ? ' '.repeat(option.tabSize) : '	';
        return [...this.insertIndent(document, indent)];
    }

    private insertIndent(document: TextDocument, indent: string): TextEdit[] {
        const editQueue: TextEdit[] = [];

        const depth: string[][] = [];
        let lastLineType: 'comment' | 'blankLine' | 'special' | 'command' = 'blankLine';
        let lastSigns = 0;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            // 改行
            if (line.isEmptyOrWhitespace) {
                depth.shift();
                editQueue.push(TextEdit.delete(line.range));
                lastLineType = 'blankLine';
                continue;
            }

            const lineText = new StringReader(line.text);

            lineText.cursor = lineText.string.indexOf(' ');
            const firstClauseChar = lineText.cursor === -1 ? lineText.string : lineText.passedString;

            // コメントについての処理
            if (firstClauseChar.startsWith('#')) {
                const content = firstClauseChar.replace(/^#+/, '');

                const commentOut = firstClauseChar.match(/^#+/) ?? [];
                switch (content) {
                    case '':
                        // 「# ～」や「## ～」の場合
                        if (lastLineType === 'comment' && commentOut.length === lastSigns)
                            depth.push(commentOut);
                        editQueue.push(TextEdit.replace(line.range, `${lastLineType === 'command' ? '\n' : ''}${indent.repeat(Math.max(depth.length, 1) - 1)}${lineText.string}`));
                        lastLineType = 'comment';
                        continue;

                    case 'declare':
                    case 'define':
                        // 「#declare ～」「#define ～」の場合
                        editQueue.push(TextEdit.replace(line.range, `${indent.repeat(Math.max(depth.length, 0))}${lineText.string}`));
                        lastLineType = 'special';
                        continue;

                    case '>':
                        depth.clear();
                        depth.push(commentOut);
                        continue;
                }

                // 前line の # の数を記憶し、次line と同じであれば 連続するコメント とみなす。
                lastSigns = commentOut.length;
            } else {
                // その他のコマンドの処理
                editQueue.push(TextEdit.replace(line.range, `${indent.repeat(Math.max(depth.length, 0))}${lastLineType === 'special' ? indent : ''}${lineText.string}`));
                lastLineType = 'command';
            }
        }

        return editQueue;
    }
}