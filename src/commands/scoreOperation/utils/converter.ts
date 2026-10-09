import { createScoreConverter } from '../core/converter'
import { scoreOperationPorts } from './ports'

export const { rpnToScoreOperation, rpnCalculate } = createScoreConverter(scoreOperationPorts)
