import { Formula, IfFormula } from '../types/Formula'
import { OperateElement, OperateTable } from '../types/OperateTable'
import { GenerateError, ParsingError } from '../../../types/Error'
import { ConditionExp, conditionExpTable } from '../types/ConditionExpTable'
import type { ScoreOperationPorts } from './ports'
import { isNumber } from '../../../utils/typeGuards'

type FormulaToken = string | { formula: Formula | string }

export function createFormulaAnalyzer(ports: ScoreOperationPorts) {
  const { locale } = ports

  function getOperator(table: OperateTable, token: FormulaToken): OperateElement | undefined {
    return typeof token === 'string' && Object.prototype.hasOwnProperty.call(table, token) ? table[token] : undefined
  }

  function analyze(exp: FormulaToken[], opTable: OperateTable, funcs: IfFormula[], scale: number): Formula | string {
    const first = exp.shift()
    if (!first)
      throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))

    if (typeof first !== 'string') {
      const grouped = typeof first.formula === 'string' ? first.formula : { ...first.formula, op: { ...first.formula.op, order: opTable['('].order } }
      return assemble(grouped, exp, opTable, funcs, scale)
    }

    const func = getOperator(opTable, first)

    // firstがopTableに登録されていなければ、ただの文字列であると考える
    if (!func) {
      const isDestination = getOperator(opTable, exp[0])?.identifier?.endsWith('=')
      const front = (scale === 1 || isDestination) ? first : { front: first, op: { ...opTable['*'], order: opTable['('].order }, back: scale.toString() }
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
        const operandToken = exp[operandStart]
        const operandEnd = typeof operandToken === 'string' && operandToken.endsWith('(') ? closingIndex(exp, operandStart) + 1 : operandStart + 1
        const operand = analyze(exp.splice(0, operandEnd), opTable, funcs, scale)
        if (getOperator(opTable, exp[0])?.identifier?.endsWith('='))
          throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
        const signed = func.identifier === '+' ? operand : { front: '0', op: { ...opTable['-'], order: opTable['('].order }, back: operand }
        return assemble(signed, exp, opTable, funcs, scale)
      // 括弧の時は深くする
      case '(':
        const lastClose = closingIndex(['(', ...exp]) - 1
        const sub = exp.slice(0, lastClose)
        exp = exp.slice(lastClose + 1)
        const isGroupedDestination = getOperator(opTable, exp[0])?.identifier?.endsWith('=')
        if (isGroupedDestination && sub.some(token => token === '+' || token === '-' || (typeof token === 'string' && token !== '(' && token.endsWith('('))))
          throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
        const innerScale = isGroupedDestination ? 1 : scale
        const inner = analyze(sub, opTable, funcs, innerScale)
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
    if (getOperator(opTable, exp[0])?.identifier?.endsWith('='))
      throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))

    const subArr: FormulaToken[][] = []
    let current: FormulaToken[] = []
    let depth = 0
    for (const token of nested) {
      if (typeof token === 'string' && token.endsWith('(')) depth++
      else if (token === ')') depth--
      if (depth < 0)
        throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
      if (token === ',' && depth === 0) {
        subArr.push(current)
        current = []
      } else current.push(token)
    }
    if (nested.some(token => typeof token !== 'string' || token.trim() !== '') || func.arity > 0) subArr.push(current)
    if (depth !== 0 || subArr.length !== func.arity || subArr.some(arg => arg.length === 0 || arg.every(token => typeof token === 'string' && token.trim() === '')))
      throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))

    if (!func.destination)
      throw new ParsingError(locale('parsing-error', func.identifier))

    const destination = func.destination
    const nameElem = destination.namely.split(' ')
    if (func.identifier === 'if(') {
      funcs.push({ condition: conditionAssembling(subArr[0], true, opTable, funcs, scale), then: analyze(subArr[1], opTable, funcs, scale), else: analyze(subArr[2], opTable, funcs, scale) })
      nameElem[0] = `$MCDUtil_${nameElem[0]}_${funcs.length}`
    }

    // Parse each referenced argument once and insert its tree as one grouped operand.
    // This preserves precedence and avoids applying valueScale again to its leaves.
    const argumentsByIndex = new Map<number, Formula | string>()
    const expanded: FormulaToken[] = nameElem.map(token => {
      const index = destination.args.indexOf(token)
      if (index === -1) return token
      if (!argumentsByIndex.has(index))
        argumentsByIndex.set(index, analyze([...subArr[index]], opTable, funcs, scale))
      return { formula: argumentsByIndex.get(index)! }
    })
    const _exp: FormulaToken[] = ['(', ...expanded, ')']

    // Conditional branches already contain scaled values; their result score is an internal reference.
    const resultScale = func.identifier === 'if(' ? 1 : scale
    return assemble(analyze(_exp, opTable, funcs, resultScale), exp, opTable, funcs, scale)
  }

  function closingIndex(tokens: FormulaToken[], start = 0): number {
    let depth = 0
    for (let index = start; index < tokens.length; index++) {
      const token = tokens[index]
      if (typeof token === 'string' && token.endsWith('(')) depth++
      else if (token === ')') depth--
      if (depth === 0) return index
    }
    throw new ParsingError(locale('too-much', '\'(\''))
  }

  function assemble(front: Formula | string, exp: FormulaToken[], opTable: OperateTable, funcs: IfFormula[], scale: number): Formula | string {
    if (!exp[0]) return front
    const toBeOp = exp.shift()!
    if (typeof toBeOp !== 'string')
      throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
    const op = getOperator(opTable, toBeOp)
    if (!op) throw new GenerateError(locale('error.not-exist', locale('operator'), toBeOp))
    if (op.type === 'state' || op.arity !== 2)
      throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
    const back = analyze(exp, opTable, funcs, scale)
    // Assignment is emitted after the right-hand expression.
    if (op.identifier.endsWith('=')) {
      if (typeof front !== 'string' || isNumber(front))
        throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
      return { front: back, op, back: front }
    }
    if (typeof back !== 'string' && back.op.identifier.endsWith('='))
      throw new GenerateError(locale('formula-to-score-operation.illegal-formula'))
    return combine(front, op, back)

    function combine(left: Formula | string, operator: Formula['op'], right: Formula | string): Formula {
      if (typeof right === 'string' || !(right.op.order < operator.order ||
        (right.op.order === operator.order && operator.assocLow === 'L')))
        return { front: left, op: operator, back: right }
      return { ...right, front: combine(left, operator, right.front) }
    }
  }

  const conditionAssembling = (exp: FormulaToken[], isTrue: boolean, opTable: OperateTable, funcs: IfFormula[], scale: number): ConditionExp[] => {
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
      const token = exp[i]
      if (typeof token === 'string' && Object.prototype.hasOwnProperty.call(conditionExpTable, token))
        splitter = i
    }
    return [{ front: analyze(exp.slice(0, splitter), opTable, funcs, scale), op: conditionExpTable[exp[splitter] as string], back: analyze(exp.slice(splitter + 1), opTable, funcs, scale), default: (exp[1] === '!=') ? !isTrue : isTrue }]
  }

  return { formulaAnalyzer: (exp: string[], opTable: OperateTable, funcs: IfFormula[], scale: number) => analyze(exp, opTable, funcs, scale) }
}
