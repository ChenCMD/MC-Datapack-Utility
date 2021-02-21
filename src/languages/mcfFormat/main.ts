import { DocumentFormattingEditProvider, TextDocument, TextEdit } from 'vscode';
import { insertIndent } from './insertIndent';

export const mcfFormat: DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        return [...insertIndent(document)];
    }
};