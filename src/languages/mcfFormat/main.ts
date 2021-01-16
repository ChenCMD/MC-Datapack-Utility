import { DocumentFormattingEditProvider, TextDocument, TextEdit } from 'vscode';

export const mcfFormat: DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        const editQueue: TextEdit[] = [];

        let depth = 0;
        let lastLineType: 'numSign' | 'blankLine' | 'other' = 'blankLine';

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const lineText = line.text.slice(line.firstNonWhitespaceCharacterIndex);

            if (lineText === '') {
                depth--;
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
                        // 「# ～」や「## ～」の場合
                        const numSigns = firstClauseChar.filter(e => e === '#').length;
                        depth = numSigns;
                        editQueue.push(TextEdit.replace(line.range, `${(lastLineType === 'other') ? '\n' : ''}${'    '.repeat(Math.max(depth - 1, 0))}${lineText}`));
                        lastLineType = 'numSign';
                        continue;

                    case 'alias':
                    case 'declare':
                    case 'define':
                        // 「#alias ～」「#declare ～」「#define ～」の場合
                        editQueue.push(TextEdit.replace(line.range, `${'    '.repeat(Math.max(depth, 0) + 1)}${lineText.trim()}`));
                        lastLineType = 'numSign';
                        continue;
                }
            }

            // その他、コマンドの処理
            let formatted = lineText.trim();

            const fixing = (char: string) => {
                let separator = formatted.indexOf(char);
                while (separator !== -1) {
                    if (!formatted.startsWith(`${char} `, separator)) {
                        const front = formatted.substring(0, separator).split('');
                        const back = formatted.substring(separator + 1).split('');

                        if (((front.filter(e => e === '[').length - front.filter(e => e === ']').length > 0
                            && back.filter(e => e === '[').length - back.filter(e => e === ']').length < 0) // Selector内である
                            || (front.filter(e => e === '{').length - front.filter(e => e === '}').length > 0
                                && back.filter(e => e === '{').length - back.filter(e => e === '}').length < 0)) // Compound間である
                            && front.filter(e => e === '\'').length % 2 === 0
                            && front.filter(e => e === '"').length % 2 === 0
                            && front.filter(e => e === '\\"').length % 2 === 0
                        )
                            formatted = [...front, char, ' ', ...back].join('');
                    }

                    separator = formatted.indexOf(char, separator + 2);
                }
            };
            fixing(',');
            fixing(':');

            editQueue.push(TextEdit.replace(line.range, `${'    '.repeat(Math.max(depth, 0))}${formatted}`));
            lastLineType = 'other';
        }

        return editQueue;
    }
};