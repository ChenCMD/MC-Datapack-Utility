import { Position, Range, TextDocument, TextEdit } from 'vscode';

export function insertProtocol(document: TextDocument): TextEdit {
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
