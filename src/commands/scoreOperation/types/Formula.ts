import { OperateElement } from './OperateTable';

export interface Formula {
    front: string | Formula
    op: OperateElement
    back: string | Formula
}

export interface IfFormulaChain {
    front: string | IfFormula
    op: OperateElement
    back: string | IfFormula
}
export interface IfFormula {
    condition: 'true' | string
    trues: string | IfFormulaChain
    falses?: string | IfFormulaChain
}