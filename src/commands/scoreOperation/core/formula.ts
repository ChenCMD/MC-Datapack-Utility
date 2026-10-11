import { Formula, IfFormula } from '../types/Formula'
import { OperateTable } from '../types/OperateTable'
import { GenerateError, ParsingError } from '../../../types/Error'
import { ConditionExp, conditionExpTable } from '../types/ConditionExpTable'
import type { ScoreOperationPorts } from './ports'

export function createFormulaAnalyzer(ports: ScoreOperationPorts) {
  const { locale } = ports

  function formulaAnalyzer(exp: string[], opTable: OperateTable, funcs: IfFormula[], scale: number): Formula | string {
    const first = exp.shift()
    if (!first)
      throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))

    const func = opTable[first]

    // firstがopTableに登録されていなければ、ただの文字列であると考える
    if (!func) {
      const front = (scale === 1) ? first : { front: first, op: { ...opTable['*'], order: opTable['('].order }, back: scale.toString() }
      return assemble(front, exp, opTable, funcs, scale)
    }

    // 関数と一部の演算子のみが、1節目に許される
    switch (func.identifier) {
      // 1文字目が単項演算子かのチェック
      case '+':
      case '-':
        let operandStart = 0
        while (exp[operandStart] === '+' || exp[operandStart] === '-') operandStart++
        if (!exp[operandStart])
          throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
        const operandEnd = exp[operandStart].endsWith('(') ? closingIndex(exp, operandStart) + 1 : operandStart + 1
        const operand = formulaAnalyzer(exp.splice(0, operandEnd), opTable, funcs, scale)
        const signed = func.identifier === '+' ? operand : { front: '0', op: { ...opTable['-'], order: opTable['('].order }, back: operand }
        return assemble(signed, exp, opTable, funcs, scale)
      // 括弧の時は深くする
      case '(':
        const lastClose = closingIndex(['(', ...exp]) - 1
        const sub = exp.slice(0, lastClose)
        exp = exp.slice(lastClose + 1)
        const inner = formulaAnalyzer(sub, opTable, funcs, scale)
        const grouped = typeof inner === 'string' ? inner : { ...inner, op: { ...inner.op, order: opTable['('].order } }
        return assemble(grouped, exp, opTable, funcs, scale)
      case ')':
        // '('がなければエラー
        throw new ParsingError(locale('too-much', '\')\''))
      default:
        if (!func.identifier.match(/^\S+\($/) || !func.destination)
          throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
    }

    const close = closingIndex([first, ...exp]) - 1
    const nested = exp.slice(0, close)
    exp = exp.slice(close + 1)

    const subArr: string[][] = []
    const separation = { new: 0, old: 0 }
    let _str: string

    // exp =  f( f( f( 1 , 2 ) , f( 3 , 4 ) ) , 5 )
    // nested = ['f('  'f('  '1'  ','  '2'  ')'  ','  'f('  '3'  ','  '4'  ')'  ')'  ','  '5']
    let i = 0
    while (i < func.arity - 1) {
      separation.new = nested.indexOf(',', separation.old)
      _str = nested.slice(separation.old, separation.new).join(' ')
      subArr[i] = _str.split(' ')
      if (_str.split('(').length === _str.split(')').length
        && _str.lastIndexOf('(') <= _str.lastIndexOf(')'))
        i++
      separation.old = separation.new + 1
    }
    subArr.push(nested.slice(separation.new + 1))

    if (!func.destination)
      throw new ParsingError(locale('parsing-error', func.identifier))

    const nameElem = func.destination.namely.split(' ')
    if (func.identifier === 'if(') {
      funcs.push({ condition: conditionAssembling(subArr[0], true, opTable, funcs, scale), then: formulaAnalyzer(subArr[1], opTable, funcs, scale), else: formulaAnalyzer(subArr[2], opTable, funcs, scale) })
      nameElem[0] = `$MCDUtil_${nameElem[0]}_${funcs.length}`
    }

    func.destination.args.forEach((e, j) => {
      for (let argIndex = nameElem.indexOf(e); argIndex !== -1; argIndex = nameElem.indexOf(e, argIndex + 1))
        nameElem[argIndex] = formulaToString(formulaAnalyzer(subArr[j], opTable, funcs, scale))
    })
    const _exp = ['(', ...nameElem, ')']

    return assemble(formulaAnalyzer(_exp, opTable, funcs, scale), exp, opTable, funcs, scale)
  }

  function closingIndex(tokens: string[], start = 0): number {
    let depth = 0
    for (let index = start; index < tokens.length; index++) {
      if (tokens[index].endsWith('(')) depth++
      else if (tokens[index] === ')') depth--
      if (depth === 0) return index
    }
    throw new ParsingError(locale('too-much', '\'(\''))
  }

  function assemble(front: Formula | string, exp: string[], opTable: OperateTable, funcs: IfFormula[], scale: number): Formula | string {
    if (!exp[0]) return front
    const toBeOp = exp.shift()!
    const op = opTable[toBeOp]
    if (!op) throw new GenerateError(locale('error.not-exist', locale('operator'), toBeOp))
    if (op.type === 'state' || op.arity !== 2)
      throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
    const back = formulaAnalyzer(exp, opTable, funcs, scale)
    // Assignment is emitted after the right-hand expression.
    if (op.identifier.endsWith('=')) return { front: back, op, back: front }
    return combine(front, op, back)

    function combine(left: Formula | string, operator: Formula['op'], right: Formula | string): Formula {
      if (typeof right === 'string' || !(right.op.order < operator.order ||
        (right.op.order === operator.order && operator.assocLow === 'L')))
        return { front: left, op: operator, back: right }
      return { ...right, front: combine(left, operator, right.front) }
    }
  }

  const formulaToString = (formula: Formula | string): string => {
    if (typeof formula === 'string')
      return formula
    return `${formulaToString(formula.front)} ${formula.op.identifier} ${formulaToString(formula.back)}`
  }

  const conditionAssembling = (exp: string[], isTrue: boolean, opTable: OperateTable, funcs: IfFormula[], scale: number): ConditionExp[] => {
    if (exp.includes('&&')) {
      const index = exp.indexOf('&&')
      return [...conditionAssembling(exp.slice(0, index), isTrue, opTable, funcs, scale), ...conditionAssembling(exp.slice(index + 1), isTrue, opTable, funcs, scale)]
    }
    if (exp.includes('||')) {
      const index = exp.indexOf('||')
      return [...conditionAssembling(exp.slice(0, index), !isTrue, opTable, funcs, scale), ...conditionAssembling(exp.slice(index + 1), !isTrue, opTable, funcs, scale)]
    }
    let splitter = 0
    for (let i = 0; i < exp.length; i++) {
      if (conditionExpTable[exp[i]])
        splitter = i
    }
    return [{ front: formulaAnalyzer(exp.slice(0, splitter), opTable, funcs, scale), op: conditionExpTable[exp[splitter]], back: formulaAnalyzer(exp.slice(splitter + 1), opTable, funcs, scale), default: (exp[1] === '!=') ? !isTrue : isTrue }]
  }

  return { formulaAnalyzer }
}
