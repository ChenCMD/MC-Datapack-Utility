import { locale } from '../../../locales'
import { codeConsole } from '../../../extension'
import { listenInput } from '../../../utils/vscodeWrapper'
import type { ScoreOperationPorts } from '../core/ports'

export const scoreOperationPorts: ScoreOperationPorts = {
  locale,
  requestObjective: listenInput,
  warn: message => codeConsole.appendLine(message)
}
