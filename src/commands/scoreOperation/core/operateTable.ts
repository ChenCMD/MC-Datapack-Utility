import rfdc from 'rfdc'
import { OperateElement, OperateTable, opTable } from '../types/OperateTable'

export function createOperateTable(customOperators: OperateElement[]): OperateTable {
  const table = rfdc()(opTable)
  for (const operator of customOperators) {
    Object.defineProperty(table, operator.identifier, {
      value: operator, enumerable: true, writable: true, configurable: true
    })
  }
  return table
}
