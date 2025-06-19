
interface GeneralNode {
  type: string
  children?: { [key: string]: ArgumentNode | LiteralNode }
  executable?: boolean
  redirect?: string[]
}

interface ArgumentNode extends GeneralNode {
  type: 'argument'
  parser: string
  properties?: Record<string, unknown>
}

interface LiteralNode extends GeneralNode {
  type: 'literal'
}

interface RootNode extends GeneralNode {
  type: 'root'
}
