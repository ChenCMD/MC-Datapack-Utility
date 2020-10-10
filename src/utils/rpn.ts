// https://github.com/spica-git/ReversePolishNotation/ からコピー、微改変

const opTable = JSON.parse('\
{\
    "table": [\
        {\
            "identifier": "(",\
            "order": 20,\
            "type": "state",\
            "arity": 0,\
            "assocLow": "",\
            "fn": "() { }"\
        },\
        {\
            "identifier": ")",\
            "order": 20,\
            "type": "state",\
            "arity": 0,\
            "assocLow": "",\
            "fn": "() { }"\
        },\
        {\
            "identifier": "#",\
            "order": 16,\
            "type": "op",\
            "arity": 1,\
            "assocLow": "R",\
            "fn": "(_l) { return _l; }"\
        },\
        {\
            "identifier": "_",\
            "order": 16,\
            "type": "op",\
            "arity": 1,\
            "assocLow": "R",\
            "fn": "(_l) { return -_l; }"\
        },\
        {\
            "identifier": "~",\
            "order": 16,\
            "type": "op",\
            "arity": 1,\
            "assocLow": "R",\
            "fn": "(_l) { return ~_l; }"\
        },\
        {\
            "identifier": "**",\
            "order": 15,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "R",\
            "fn": "(_l, _r) { return _l ** _r; }"\
        },\
        {\
            "identifier": "*",\
            "order": 14,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return (typeof _l === \'number\' && typeof _r === \'number\')? _l * _r: `${_l} * ${_r}`; }"\
        },\
        {\
            "identifier": "/",\
            "order": 14,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return (typeof _l === \'number\' && typeof _r === \'number\')? _l / _r: `${_l} / ${_r}`; }"\
        },\
        {\
            "identifier": "%",\
            "order": 14,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return (typeof _l === \'number\' && typeof _r === \'number\')? _l % _r: `${_l} % ${_r}`; }"\
        },\
        {\
            "identifier": "+",\
            "order": 13,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return (typeof _l === \'number\' && typeof _r === \'number\')? _l + _r: `${_l} + ${_r}`; }"\
        },\
        {\
            "identifier": "-",\
            "order": 13,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return (typeof _l === \'number\' && typeof _r === \'number\')? _l - _r: `${_l} - ${_r}`; }"\
        },\
        {\
            "identifier": "<<",\
            "order": 12,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return _l << _r; }"\
        },\
        {\
            "identifier": ">>",\
            "order": 12,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return _l >> _r; }"\
        },\
        {\
            "identifier": "&",\
            "order": 9,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return _l & _r; }"\
        },\
        {\
            "identifier": "^",\
            "order": 8,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return _l ^ _r; }"\
        },\
        {\
            "identifier": "|",\
            "order": 7,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "L",\
            "fn": "(_l, _r) { return _l | _r; }"\
        },\
        {\
            "identifier": "=",\
            "order": 3,\
            "type": "op",\
            "arity": 2,\
            "assocLow": "R",\
            "fn": "(_l, _r) { return `${_l} = ${_r}`; }"\
        }\
    ],\
    "identifiers": [\
        "(", ")", "#", "_", "~", "**", "*", "/", "%", "+", "-", "<<", ">>", "&", "^", "|", "="\
    ]\
}');

/**
 * @description 演算子の定義
 *  identifier: 演算子
 * 	order: 演算の優先順位（MDNの定義に準拠）
 * 		https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
 *  type: 識別に用いる
 * 	arity: 演算項の数
 *	assocLow: 結合法則（"":なし, "L":左結合(left to right), "R":右結合(right to left)）
 * 	fn: 演算処理
 */
const table: {
    identifier: string;
    order: number;
    type: string;
    arity: number;
    assocLow: string;
    fn: Function;
}[] = [];
for (let i = 0; i < opTable.table.length; i++) {
    table.push({
        identifier: opTable.table[i].identifier,
        order: opTable.table[i].order,
        type: opTable.table[i].type,
        arity: opTable.table[i].arity,
        assocLow: opTable.table[i].assocLow,
        fn: new Function("return function " + opTable.table[i].fn)()
    });
}

/**
 * Search String From operation Table
 * @param {string} _str check this param in Operation Table
 */
function ssft(_str: string) {
    return opTable.identifiers.indexOf(_str);
};

/**
 * @description 逆ポーランド記法の式を計算する
 * @param {string} rpnExp 計算式
 */
export function rpnCalculation(rpnExp: string) {
    ///引数エラー判定
    if (rpnExp === null || typeof rpnExp !== 'string') { throw new Error("illegal arg type"); }

    //演算子と演算項を切り分けて配列化する。再起するので関数化。
    function fnSplitOperator(_val: string) {
        if (_val === "") { return; }

        //演算子判定
        if (ssft(_val) !== -1 && isNaN(Number(_val.toString()))) {
            rpnStack.push({
                value: _val,
                type: table[ssft(_val)].type
            });
            return;
        }

        //演算子を含む文字列かどうか判定
        for (let i = 0; i < opTable.identifiers.length; i++) {
            var piv = _val.indexOf(table[i].identifier);
            if (piv !== -1) {
                fnSplitOperator(_val.substring(0, piv));
                fnSplitOperator(_val.substring(piv, piv + opTable.identifiers[i].length));
                fnSplitOperator(_val.substring(piv + opTable.identifiers[i].length));
                return;
            }
        }

        //数値
        if (!isNaN(parseFloat(_val))) {
            rpnStack.push({ value: _val, type: "num" });
        }
        //文字列
        else {
            rpnStack.push({ value: _val, type: "str" });
        }
    };

    //切り分け実行
    //式を空白文字かカンマでセパレートして配列化＆これらデリミタを式から消す副作用
    var rpnStack: { value: string, type: string }[] = [];
    var rpnArray = rpnExp.split(/\s+|,/);
    for (var i = 0; i < rpnArray.length; i++) {
        fnSplitOperator(rpnArray[i]);
    }

    ///演算開始
    var calcStack: (number | string)[] = []; //演算結果スタック
    while (rpnStack.length > 0) {
        var elem = rpnStack.shift()!;
        switch (elem.type) {
            //演算項（数値のparse）
            case "num":
                calcStack.push(
                    elem.value.indexOf("0x") !== -1 ? parseInt(elem.value, 16) : parseFloat(elem.value)
                );
                break;

            //演算項（文字列）※数値以外のリテラルを扱うような機能は未サポート
            case "str":
                calcStack.push(elem.value);
                break;

            //制御文 ※計算時にはないはずなのでwarningを出して無視
            case "state":
                console.warn("inclute statement:" + elem.value);
                break;

            //演算子・計算機能
            case "op": case "fn":
                var operate = table[ssft(elem.value)];
                if (operate === null) { throw new Error("not exist operate:" + elem.value); }

                //演算に必要な数だけ演算項を抽出
                var args = [];
                for (var i = 0; i < operate.arity; i++) {
                    if (calcStack.length > 0) {
                        args.unshift(calcStack.pop());
                    }
                    else {
                        throw new Error("not enough operand");
                    }
                }

                //演算を実行して結果をスタックへ戻す
                var res: any = operate.fn.apply(null, args);
                if (res !== null) { calcStack.push(res); }
                break;
        }
    }

    ///途中失敗の判定
    if (rpnStack.length > 0 || calcStack.length !== 1) {
        console.warn({ message: "calculate unfinished", restRpn: rpnStack, resultValue: calcStack });
        return "";
    }

    ///計算結果を戻す
    return calcStack[0];
}


/**
 * @description 計算式から逆ポーランド記法を生成
 * @param {string} exp 計算式
 */
export function rpnGenerate(exp: string) {
    var polish = []; ///parse結果格納用
    var opeStack: any[][] = [[]]; ///演算子スタック
    var depth = 0; ///括弧のネスト深度
    var unary = true; //単項演算子チェック（正負符号等）

    do {
        //先頭の空白文字とカンマを消去
        exp = exp.replace(/^(\s|,)+/, "");
        if (exp.length === 0) { break; }

        //演算子スタック
        opeStack[depth] = opeStack[depth] || [];

        ///数値抽出（整数・小数・16進数）
        var g = exp.match(/(^0x[0-9a-f]+)|(^[0-9]+(\.[0-9]+)?)/i);
        if (g !== null) {
            polish.push(g[0].indexOf("0x") === 0 ? parseInt(g[0], 16) : parseFloat(g[0]));
            exp = exp.substring(g[0].length);
            unary = false;
            continue;
        }

        //演算子抽出
        var op = null;
        for (var key in table) {
            if (exp.indexOf(table[key].identifier) === 0) {
                op = table[key].identifier;
                exp = exp.substring(table[key].identifier.length);
                break;
            }
        }

        if (op === null) {
            g = exp.match(/^([a-z]+)/i);
            if (g !== null) {
                polish.push(g[0]);
                exp = exp.substring(g[0].length);
                unary = false;
                continue;
            }
            throw new Error("illegal expression:" + exp.substring(0, 10) + " ...");
        }

        ///スタック構築
        ///・各演算子の優先順位
        ///・符合の単項演算子化
        switch (op) {
            default:
                ///+符号を#に、-符号を_に置換
                if (unary) {
                    if (op === '+') { op = '#'; }
                    else if (op === '-') { op = '_'; }
                }

                //演算子スタックの先頭に格納
                //・演算子がまだスタックにない
                //・演算子スタックの先頭にある演算子より優先度が高い
                //・演算子スタックの先頭にある演算子と優先度が同じでかつ結合法則がright to left
                if (opeStack[depth].length === 0 ||
                    table[ssft(op)].order > table[ssft(opeStack[depth][0])].order ||
                    (table[ssft(op)].order === table[ssft(opeStack[depth][0])].order && table[ssft(op)].assocLow === "R")
                ) {
                    opeStack[depth].unshift(op);
                } else {
                    //式のスタックに演算子を積む
                    //演算子スタックの先頭から、優先順位が同じか高いものを全て抽出して式に積む
                    //※優先順位が同じなのは結合法則がright to leftのものだけスタックに積んである
                    //演算優先度が、スタック先頭の演算子以上ならば、続けて式に演算子を積む
                    while (opeStack[depth].length > 0) {
                        var ope = opeStack[depth].shift();
                        polish.push(ope);
                        if (table[ssft(ope)].order < table[ssft(op)].order) { break; }
                    }
                    opeStack[depth].unshift(op);
                }
                unary = true;
                break;

            //括弧はネストにするので特別
            case "(":
                depth++;
                unary = true;
                break;

            case ")":
                while (opeStack[depth].length > 0) { ///演算子スタックを全て処理
                    polish.push(opeStack[depth].shift());
                }
                if (--depth < 0) {
                    //括弧閉じ多すぎてエラー
                    throw new Error("too much ')'");
                }
                unary = false; ///括弧を閉じた直後は符号（単項演算子）ではない
                break;
        }
    } while (exp.length > 0);

    if (depth > 0) {
        console.warn({ message: "too much '('", restExp: exp });
    }
    else if (exp.length > 0) {
        console.warn({ message: "generate unifinished", restExp: exp });
    }
    else {
        while (opeStack[depth].length > 0) {
            polish.push(opeStack[depth].shift());
        }
        return polish.join(" ");
    }

    return "";
};
