import { DocumentFormattingEditProvider, FormattingOptions, ProviderResult, TextDocument, TextEdit } from 'vscode';

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
            const lineText = line.text.slice(line.firstNonWhitespaceCharacterIndex);

            // 改行
            if (lineText === '') {
                depth.shift();
                editQueue.push(TextEdit.delete(line.range));
                lastLineType = 'blankLine';
                continue;
            }

            const firstClauseChar = lineText.slice(0, `${lineText} `.indexOf(' ')).split('');

            // コメントについての処理
            if (firstClauseChar.includes('#')) {
                const commentOut = firstClauseChar.filter(e => e === '#');
                switch (firstClauseChar.filter(e => e !== '#').join('')) {
                    case '':
                        // 「# ～」や「## ～」の場合
                        if (lastLineType === 'comment' && commentOut.length === lastSigns)
                            depth.push(commentOut);
                        editQueue.push(TextEdit.replace(line.range, `${(lastLineType === 'command') ? '\n' : ''}${indent.repeat(Math.max(depth.length - 1, 0))}${lineText}`));
                        lastLineType = 'comment';
                        continue;

                    case 'declare':
                    case 'define':
                        // 「#alias ～」「#declare ～」「#define ～」の場合
                        editQueue.push(TextEdit.replace(line.range, `${indent.repeat(Math.max(depth.length, 0))}${lineText}`));
                        lastLineType = 'special';
                        continue;

                    case '>':
                        depth.clear();
                        depth.push(commentOut);
                        continue;
                }

                lastSigns = commentOut.length;
            } else {
                // その他、コマンドの処理(DHPがやってくれる)
                editQueue.push(TextEdit.replace(line.range, `${indent.repeat(Math.max(depth.length, 0))}${(lastLineType === 'special') ? indent : ''}${lineText}`));
                lastLineType = 'command';
            }
        }

        return editQueue;
    }
}