import { CallJungle, CallNode, getLabel, NodeForest } from './CallNode'
import { EscapedChar } from './EscapedChar'
import { isFileType, ParserType } from './ParserType'

// https://mermaid.js.org/syntax/flowchart.html#complete-list-of-new-shapes, 2025/08/22
type GraphShape =
  | 'notch-rect' | 'card' | 'notched-rectangle'
  | 'hourglass' | 'collate' | 'hourglass'
  | 'bolt' | 'com-link' | 'lightning-bolt'
  | 'brace' | 'brace-l' | 'comment'
  | 'brace-r'
  | 'braces'
  | 'lean-r' | 'in-out' | 'lean-right'
  | 'lean-l' | 'lean-left' | 'out-in'
  | 'cyl' | 'cylinder' | 'database' | 'db'
  | 'diam' | 'decision' | 'diamond' | 'question'
  | 'delay' | 'half-rounded-rectangle'
  | 'h-cyl' | 'das' | 'horizontal-cylinder'
  | 'lin-cyl' | 'disk' | 'lined-cylinder'
  | 'curv-trap' | 'curved-trapezoid' | 'display'
  | 'div-rect' | 'div-proc' | 'divided-process' | 'divided-rectangle'
  | 'doc' | 'doc' | 'document'
  | 'rounded' | 'event'
  | 'tri' | 'extract' | 'triangle'
  | 'fork' | 'join'
  | 'win-pane' | 'internal-storage' | 'window-pane'
  | 'f-circ' | 'filled-circle' | 'junction'
  | 'lin-doc' | 'lined-document'
  | 'lin-rect' | 'lin-proc' | 'lined-process' | 'lined-rectangle' | 'shaded-process'
  | 'notch-pent' | 'loop-limit' | 'notched-pentagon'
  | 'flip-tri' | 'flipped-triangle' | 'manual-file'
  | 'sl-rect' | 'manual-input' | 'sloped-rectangle'
  | 'trap-t' | 'inv-trapezoid' | 'manual' | 'trapezoid-top'
  | 'docs' | 'documents' | 'st-doc' | 'stacked-document'
  | 'st-rect' | 'processes' | 'procs' | 'stacked-rectangle'
  | 'odd'
  | 'flag' | 'paper-tape'
  | 'hex' | 'hexagon' | 'prepare'
  | 'trap-b' | 'priority' | 'trapezoid' | 'trapezoid-bottom'
  | 'rect' | 'proc' | 'process' | 'rectangle'
  | 'circle' | 'circ'
  | 'sm-circ' | 'small-circle' | 'start'
  | 'dbl-circ' | 'double-circle'
  | 'fr-circ' | 'framed-circle' | 'stop'
  | 'bow-rect' | 'bow-tie-rectangle' | 'stored-data'
  | 'fr-rect' | 'framed-rectangle' | 'subproc' | 'subprocess' | 'subroutine'
  | 'cross-circ' | 'crossed-circle' | 'summary'
  | 'tag-doc' | 'tag-doc' | 'tagged-document'
  | 'tag-rect' | 'tag-proc' | 'tagged-process' | 'tagged-rectangle'
  | 'stadium' | 'pill' | 'terminal'
  | 'text'

type Identifier = `${string}!${ParserType}$${EscapedChar}`
export type GraphDefinition =
  | `${Identifier}@{ label: "${EscapedChar}", shape: ${GraphShape} }`
  | `subgraph ${Identifier}[${EscapedChar}]\n${string}\nend`
export type GraphRelation = `${Identifier} --> ${Identifier}`
type GraphClick = `click ${Identifier} callback "Jump to ${string}"`

export type Graph = {
  def: GraphDefinition[]
  rel: GraphRelation[]
  click: GraphClick[]
}

function getShape(type: string): GraphShape {
  switch (type as ParserType) {
    case 'function':
      return 'rectangle'
    case 'tag/function':
      return 'stacked-rectangle'
    default:
      return 'circle'
  }
}

function nodeToIdentifier(node: CallNode): Identifier {
  return `${node.parent ? nodeToIdentifier(node.parent) : ''}!${node.type}$${node.arg}` as Identifier
  // return `${prefix}!${node.type}$${getLabel(node)}`
}

function makeGraphDefinition(root: NodeForest): GraphDefinition[] {
  const defs: GraphDefinition[] = []
  
  for (const node of root.sparse)
    defs.push(`${nodeToIdentifier(node)}@{ label: "${getLabel(node)}", shape: ${getShape(node.type)} }`)

  for (const [node, tree] of root.dense)
    defs.push(`subgraph ${nodeToIdentifier(node)}[${getLabel(node)}]\n${makeGraphDefinition(tree).join('\n')}\nend`)
  
  return defs
}

function makeGraphRelation(from: CallNode, to: CallNode): GraphRelation {
  return `${nodeToIdentifier(from)} --> ${nodeToIdentifier(to)}`
}

function makeGraphClick(nodes: CallNode[]): GraphClick[] {
  return nodes
    .filter(node => isFileType(node.type))
    .map(node => `click ${nodeToIdentifier(node)} callback "Jump to ${getLabel(node)}"` as GraphClick)
}

export function makeGraph(call: CallJungle): Graph {
  return {
    def: makeGraphDefinition(call.forest),
    rel: call.relation.map(([from, to]) => makeGraphRelation(from, to)),
    click: makeGraphClick(call.forest.topLevels())
  }
}

