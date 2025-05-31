import { ConditionExp } from './ConditionExpTable'
import { OperateElement } from './OperateTable'

export interface Formula {
  front: string | Formula
  op: OperateElement
  back: string | Formula
}

export interface IfFormula {
  condition: ConditionExp[]
  then: string | Formula
  else: string | Formula
}
