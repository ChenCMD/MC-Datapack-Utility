import { window } from 'vscode';
import * as rpn from '../utils/rpn';
import '../utils/methodExtensions';
const scoreTable: IScoreTable = JSON.parse('\
{\
    "table": [\
        {\
            "identifier": "*",\
            "order": 14,\
            "type": "op",\
            "axiom": "scoreboard players operation arg[0] _ *= arg[1] _"\
        },\
        {\
            "identifier": "/",\
            "order": 14,\
            "type": "op",\
            "axiom": "scoreboard players operation arg[0] _ /= arg[1] _"\
        },\
        {\
            "identifier": "%",\
            "order": 14,\
            "type": "op",\
            "axiom": "scoreboard players operation arg[0] _ %= arg[1] _"\
        },\
        {\
            "identifier": "+",\
            "order": 13,\
            "type": "op",\
            "axiom": "scoreboard players operation arg[0] _ += arg[1] _"\
        },\
        {\
            "identifier": "-",\
            "order": 13,\
            "type": "op",\
            "axiom": "scoreboard players operation arg[0] _ -= arg[1] _"\
        },\
        {\
            "identifier": "=",\
            "order": 3,\
            "type": "op",\
            "axiom": "scoreboard players operation arg[0] _ = arg[1] _"\
        }\
    ],\
    "identifiers": [ "*", "/", "%", "+", "-", "=" ]\
}');
interface IScoreElement {
    identifier: string;
    order: number;
    type: string;
    axiom: string;
}

interface IScoreTable {
    table: Array<IScoreElement>
    identifiers: Array<string>
}
interface ITable {
    identifier: string  //演算子
    order: number       //優先度
    type: string        //種類
    axiom: string       //Operationの式
}

interface IStack {
    value: string
    type: string
}

export async function scoreOperation() {
    const prefix = '$MCCUTIL_';

    const table: ITable[] = scoreTable.table;

    const editor = window.activeTextEditor;
    if (!editor) { return; }

    let text = editor.document.getText(editor.selection);

    let formula = '';
    //セレクトされていないならInputBoxを表示
    if (text === '') {
        let res = await window.showInputBox({ prompt: 'formula?' });
        if (!res || res === '') { return; }
        text = res;
    }
    formula = rpn.rpnGenerate(text);


    function fnSplitOperator(_val: string, _table: ITable[], _stack: IStack[]) {
        if (!_val) { return; }

        if (rpn.ssft(_val, scoreTable) !== -1 && isNaN(Number(_val.toString()))) {
            _stack.push({
                value: _val,
                type: _table[rpn.ssft(_val, scoreTable)].type
            });
            return;
        }

        for (let i in scoreTable.identifiers) {
            const piv = _val.indexOf(_table[i].identifier);
            if (piv !== -1) {
                fnSplitOperator(_val.substring(0, piv), _table, _stack);
                fnSplitOperator(_val.substring(piv, piv + scoreTable.identifiers[i].length), _table, _stack);
                fnSplitOperator(_val.substring(piv + scoreTable.identifiers[i].length), _table, _stack);
                return;
            }
        }

        if (Number(_val).isValue()) {
            _stack.push({ value: _val, type: "num" });
        }
        else {
            _stack.push({ value: _val, type: "str" });
        }
    }

    let rpnStack: IStack[] = [];
    for (const elem of formula.split(/\s+|,/)) {
        fnSplitOperator(elem, table, rpnStack);
    }

    let calcStack: (number | string)[] = [];
    let resValues = [''];
    let resFormulas = '';

    while (rpnStack.length > 0) {
        const elem = rpnStack.shift();
        if (!elem) { return; }
        switch (elem.type) {
            case "num":
                // 16進数の場合は10進数へ
                const put = elem.value.indexOf("0x") !== -1 ? parseInt(elem.value, 16) : parseFloat(elem.value);
                calcStack.push(put);
                // 仮でCMDUTILという名前に
                resValues.push(`scoreboard players set ${prefix}${elem.value} _ ${put}`);
                break;

            case "str":
                calcStack.push(elem.value);
                break;

            case "op": case "fn":
                const operate = table[rpn.ssft(elem.value, scoreTable)];

                let str = operate.axiom;
                if (!str) { return; }
                for (let i = 1; i >= 0; i--) {
                    if (str.indexOf(`arg[${i}]`) !== -1) {
                        const lastStackElement = calcStack.pop();
                        if (!lastStackElement) { return; }
                        const ARG = `${prefix}${lastStackElement.toString()}`;
                        str = str.substring(0, str.indexOf(`arg[${i}]`)) + ARG
                            + str.substring(str.indexOf(`arg[${i}]`) + `arg[${i}]`.length);

                        // 計算結果をどう格納するか模索中...
                        if (i === 0) { calcStack.push(ARG.slice(prefix.length)); }
                    }
                }

                resFormulas += `${str}\r\n`;
                break;
        }
    }

    editor.edit(edit => {
        edit.replace(editor.selection, [
            `# ${text}`,
            '#if u wish, u can change both <Holder>s\' NAME and the OBJECT _',
            resValues.filter(function (value, index, self) {
                return self.indexOf(value) === index;
            }).join('\r\n'),
            '',
            resFormulas
        ].join('\r\n'));
    });
}