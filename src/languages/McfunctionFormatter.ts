import { DocumentFormattingEditProvider, FormattingOptions, Position, ProviderResult, Range, TextDocument, TextEdit } from 'vscode';
import { config } from '../extension';
import { Deque } from '../types/Deque';
import { StringReader } from '../utils/StringReader';

export class McfunctionFormatter implements DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: TextDocument, option: FormattingOptions): ProviderResult<TextEdit[]> {
        const indent = option.insertSpaces ? ' '.repeat(option.tabSize) : '	';
        return [this.insertProtocol(document), ...this.insertIndent(document, indent)];
    }

    private insertIndent(document: TextDocument, indent: string): TextEdit[] {
        const editQueue: TextEdit[] = [];

        const depth = new Deque<number>();
        let lastLineType: 'comment' | 'blankLine' | 'special' | 'command' = 'blankLine';

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            // 改行
            if (line.isEmptyOrWhitespace) {
                if (depth.size() > 0)
                    depth.removeLast();
                editQueue.push(TextEdit.delete(line.range));
                lastLineType = 'blankLine';
                continue;
            }

            const lineText = new StringReader(line.text, 0, line.text.indexOf(' '));
            
            while (lineText.peek() === '#') lineText.skip();
            
            // コマンドについての処理
            if (lineText.cursor === 0) {
                editQueue.push(TextEdit.replace(line.range, `${indent.repeat(depth.size())}${lastLineType === 'special' ? indent : ''}${lineText.string}`));
                lastLineType = 'command';
                continue;
            }

            // コメントについての処理
            const commentOut = lineText.passedString.length;
            switch (lineText.remainingString) {
                case '':
                    // 「# ～」や「## ～」の場合
                    if (lastLineType === 'comment' && commentOut === depth.getLast())
                        // 前line の # の数を記憶し、次line と同じであれば 連続するコメント とみなす。
                        depth.addLast(commentOut);
                    editQueue.push(TextEdit.replace(line.range, `${lastLineType === 'command' ? '\n' : ''}${indent.repeat(Math.max(depth.size() - 1, 0))}${lineText.string}`));
                    lastLineType = 'comment';
                    continue;

                case 'declare':
                case 'define':
                    // 「#declare ～」「#define ～」の場合
                    editQueue.push(TextEdit.replace(line.range, `${indent.repeat(depth.size())}${lineText.string}`));
                    lastLineType = 'special';
                    continue;

                case '>':
                    depth.clear();
                    depth.addLast(commentOut);
                    continue;
            }
        }

        return editQueue;
    }

    private insertProtocol(document: TextDocument): TextEdit {
        if (!config.mcfFormatter.doInsertIMPDocument)
            // TODO 何もおこなわれない場合に関しての処理
            return new TextEdit(new Range(0, 0, 0, 0), '');
    
        const path = document.uri.path.split(/\//g);
        const fileName = (path.pop() ?? '').replace('.mcfunction', '');
        path.push('');
    
        const delivery = (filepath: string) => {
            if (document.lineAt(0).text === filepath)
                // TODO 何もおこなわれない場合に関しての処理
                return new TextEdit(new Range(0, 0, 0, 0), '');
    
            return TextEdit.insert(new Position(0, 0), `${filepath}\n\n`);
        };
    
        const index = path.indexOf('functions');
    
        if (index === -1 || path[index - 2] !== 'data')
            return delivery(`#> minecraft:${fileName}`);
    
        return delivery(`#> ${path[index - 1]}:${path.slice(index + 1).join('/')}${fileName}`);
    }
}