import { createFormulaAnalyzer } from '../core/formula'
import { scoreOperationPorts } from './ports'

export const { formulaAnalyzer } = createFormulaAnalyzer(scoreOperationPorts)
