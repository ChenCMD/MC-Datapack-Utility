/** External effects used by score conversion. Each invocation owns its dependencies. */
export interface ScoreOperationPorts {
  locale: (key: string, ...params: (string | number)[]) => string
  requestObjective: (message: string) => Promise<string | undefined>
  warn: (message: string) => void
}
