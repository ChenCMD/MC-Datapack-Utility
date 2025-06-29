import { CallNode } from './CallNode'

export class CallBiMap {
  /** Key: Caller, Value: Callees */
  private readonly ofFrom: { [from: CallNode]: CallNode[] } = {}
  /** Key: Callee, Value: Callers */
  private readonly ofTo: { [to: CallNode]: CallNode[] } = {}

  register(from: CallNode, to: CallNode): void {
    if (!this.ofFrom[from]) this.ofFrom[from] = []
    if (!this.ofTo[to]) this.ofTo[to] = []

    this.ofFrom[from].push(to)
    this.ofTo[to].push(from)
  }

  getCallees(node: CallNode) : CallNode[] {
    return this.ofFrom[node] || []
  }

  getCallers(node: CallNode) : CallNode[] {
    return this.ofTo[node] || []
  }
}
