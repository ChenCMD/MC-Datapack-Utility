import vscode = require('vscode');
import rpn = require('../utils/rpn');
const scoreTable = JSON.parse('\
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

export async function scoreOperation() {
    const table: {
        identifier: string; //演算子
        order: number;      //優先度
        type: string;       //種類
        axiom: string;      //Operationの式
    }[] = [];
    for (let i = 0; i < scoreTable.table.length; i++) {
        let t = scoreTable.table[i];
        table.push({
            identifier: t.identifier,
            order: t.order,
            type: t.type,
            axiom: t.axiom
        });
    }

    function ssft(_str: string) { return scoreTable.identifiers.indexOf(_str); }; // Search String From operateTable

    const editor = vscode.window.activeTextEditor!;
    let text = editor.document.getText(editor.selection);

    let formula: string;
    //セレクトされていないならInputBoxを表示
    if (text === '') {
        let res = await vscode.window.showInputBox({ prompt: 'formula?' });
        text = res!;
        if (res !== '') {
            formula = rpn.rpnGenerate(res!);
        } else {
            //セレクトもInputBoxの結果もない場合はエラーを吐いて終わり
            vscode.window.showErrorMessage('Formula NOT SELECTED');
            return;
        }
    } else {
        formula = rpn.rpnGenerate(text);
    }

    function fnSplitOperator(_val: string) {
        if (_val === "") { return; }

        if (ssft(_val) !== -1 && isNaN(Number(_val.toString()))) {
            rpnStack.push({
                value: _val,
                type: table[ssft(_val)].type
            });
            return;
        }

        for (let i = 0; i < scoreTable.identifiers.length; i++) {
            var piv = _val.indexOf(table[i].identifier);
            if (piv !== -1) {
                fnSplitOperator(_val.substring(0, piv));
                fnSplitOperator(_val.substring(piv, piv + scoreTable.identifiers[i].length));
                fnSplitOperator(_val.substring(piv + scoreTable.identifiers[i].length));
                return;
            }
        }

        if (!isNaN(Number(_val))) {
            rpnStack.push({ value: _val, type: "num" });
        }
        else {
            rpnStack.push({ value: _val, type: "str" });
        }
    };

    var rpnStack: { value: string, type: string }[] = [];
    var rpnArray = formula.split(/\s+|,/);
    for (var i = 0; i < rpnArray.length; i++) {
        fnSplitOperator(rpnArray[i]);
    }

    var calcStack: (number | string)[] = [];
    let resValues = '';
    let resFormulas = '';
    while (rpnStack.length > 0) {
        var elem = rpnStack.shift()!;
        switch (elem.type) {
            case "num":
                // 16進数の場合は10進数へ
                let put = elem.value.indexOf("0x") !== -1 ? parseInt(elem.value, 16) : parseFloat(elem.value);
                calcStack.push(put);
                // 仮でCMDUTILという名前に
                resValues += `scoreboard players set $MCCUTIL_${elem.value} _ ${put}\n`;
                break;

            case "str":
                calcStack.push(elem.value);
                break;

            case "op": case "fn":
                var operate = table[ssft(elem.value)];

                let str = operate.axiom!;
                for (var i = 1; i >= 0; i--) {
                    if (str.indexOf(`arg[${i}]`) !== -1) {
                        let t = `$CMDUTIL_${calcStack.pop()!.toString()}`;
                        str = str.substring(0, str.indexOf(`arg[${i}]`)) + t
                            + str.substring(str.indexOf(`arg[${i}]`) + `arg[${i}]`.length);

                        // 計算結果をどう格納するか模索中...
                        if (i === 0) { calcStack.push(t.slice('$MCCUTIL_'.length)); }
                    }
                }

                resFormulas += `${str}\n`;
                break;
        }
    }

    editor.edit(edit => {
        edit.replace(editor.selection, [
            `# ${text}`,
            '#if u wish, u can change both <Holder>s\' NAME and the OBJECT _',
            '',
            resValues,
            resFormulas
        ].join('\n'));
    });
}