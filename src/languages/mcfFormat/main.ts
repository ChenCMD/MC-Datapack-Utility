import { DocumentFormattingEditProvider, FormattingOptions, TextDocument, TextEdit } from 'vscode';
import { insertIndent } from './insertIndent';

export const mcfFormat: DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: TextDocument, option: FormattingOptions): TextEdit[] {
        const indent = option.insertSpaces ? ' '.repeat(option.tabSize) : '	';
        return [...insertIndent(document, indent)];
    }
};