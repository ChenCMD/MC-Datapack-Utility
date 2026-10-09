import { createFormulaQueue } from '../core/queue'
import { scoreOperationPorts } from './ports'

export const { formulaToQueue } = createFormulaQueue(scoreOperationPorts)
