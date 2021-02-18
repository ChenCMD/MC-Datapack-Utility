import { DocumentFormattingEditProvider, TextDocument, TextEdit } from 'vscode';

export const mcfFormat: DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        const editQueue: TextEdit[] = [];

        const depth = [];
        let lastLineType: 'numSign' | 'blankLine' | 'other' = 'blankLine';

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

            const firstClauseChar = lineText.slice(0, lineText.indexOf(' ')).split('');

            // コメントについての処理
            if (firstClauseChar.indexOf('#') !== -1) {
                switch (firstClauseChar.filter(e => e !== '#').join('')) {
                    case '':
                    case '>':
                        // 「# ～」や「## ～」、「#> ～」の場合
                        depth.push(firstClauseChar.filter(e => e === '#').join(''));
                        editQueue.push(TextEdit.replace(line.range, `${(lastLineType === 'other') ? '\n' : ''}${'    '.repeat(Math.max(depth.length - 1, 0))}${lineText}`));
                        lastLineType = 'numSign';
                        continue;

                    case 'alias':
                    case 'declare':
                    case 'define':
                        // 「#alias ～」「#declare ～」「#define ～」の場合
                        editQueue.push(TextEdit.replace(line.range, `${'    '.repeat(Math.max(depth.length, 0) + 1)}${lineText.trim()}`));
                        lastLineType = 'numSign';
                        continue;
                }
            }

            // その他、コマンドの処理(DHPがやってくれる)
            editQueue.push(TextEdit.replace(line.range, `${'    '.repeat(Math.max(depth.length, 0))}${lineText.trim()}`));
            lastLineType = 'other';
        }

        return editQueue;
    }
};