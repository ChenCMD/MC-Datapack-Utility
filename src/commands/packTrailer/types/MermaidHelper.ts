import { CallNode } from './CallNode'

export type GraphDefinition = `${CallNode}@{ label: '${string}', shape: '${string}' }`
export type GraphRelation = `${CallNode} --> ${CallNode}`

export type GraphSection = {
  /** definitions */
  def: Set<GraphDefinition>

  /** relations */
  rel: Set<GraphRelation>

  /** click events */
  // click: Set<string>
}
