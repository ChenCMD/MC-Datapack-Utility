import { DocumentFormattingEditProvider, TextDocument, TextEdit } from 'vscode';

export const mcfFormat: DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        const editQueue: TextEdit[] = [];

        let depth = 0;
        let isLastNumSign = true;
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const lineText = line.text.slice(line.firstNonWhitespaceCharacterIndex);
            
            if (lineText === '') {
                depth--;
                editQueue.push(TextEdit.delete(line.range));
                isLastNumSign = true;
                continue;
            }

            const firstClauseChar = lineText.slice(0, lineText.indexOf(' ')).split('');

            const numSigns = firstClauseChar.filter(e => e === '#').length;
            if (numSigns !== 0) {
                depth = numSigns - 1;
                editQueue.push(TextEdit.replace(line.range, `${(isLastNumSign)? '': '\n'}${'    '.repeat(Math.max(depth, 0))}${lineText}`));
                isLastNumSign = true;
            } else {
                depth++;
                editQueue.push(TextEdit.replace(line.range, `${'    '.repeat(Math.max(depth--, 0))}${lineText}`));
                isLastNumSign = false;
            }
        }
        return editQueue;
    }
};