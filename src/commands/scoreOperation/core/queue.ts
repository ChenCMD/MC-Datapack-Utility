import { QueueElement } from '../types/QueueElement'
import { Formula } from '../types/Formula'
import { ScoreOperationConfig } from '../../../types/Config'
import { Deque } from '../../../utils/Deque'
import { isNumber } from '../../../utils/typeGuards'
import type { ScoreOperationPorts } from './ports'

export function createFormulaQueue(ports: ScoreOperationPorts) {
  const { locale, requestObjective } = ports

  const formulaToQueue = async (value: Formula | string, queue: Deque<QueueElement>, config: ScoreOperationConfig, enteredObjectives: Map<string, string>): Promise<boolean> => {
    if (typeof value !== 'string') {
      const res1 = await formulaToQueue(value.front, queue, config, enteredObjectives)
      if (!res1) return false
      const res2 = await formulaToQueue(value.back, queue, config, enteredObjectives)
      if (!res2) return false
      queue.addLast({ value: value.op.identifier, objective: '', type: value.op.type })
      return true
    }
    let objective = enteredObjectives.get(value) ?? config.objective
    if (isNumber(value)) {
      queue.addLast({ value, objective, type: 'num' })
    } else {
      if (config.isAlwaysSpecifyObject && !value.startsWith(config.prefix) && !enteredObjectives.has(value)) {
        const str = await requestObjective(locale('formula-to-score-operation.specifying-object', value))
        if (str === undefined) return false
        objective = str ?? objective
      }
      queue.addLast({ value, objective, type: 'str' })
    }
    enteredObjectives.set(value, objective)
    return true
  }

  return { formulaToQueue }
}
