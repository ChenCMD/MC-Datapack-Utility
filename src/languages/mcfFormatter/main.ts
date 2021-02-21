import { DocumentFormattingEditProvider, TextDocument, TextEdit } from 'vscode';
import { insertIndent } from './insertIndent';
import { insertProtocol } from './insertProtocol';

export const mcfFormatter: DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        return [insertProtocol(document), ...insertIndent(document)];
    }
};