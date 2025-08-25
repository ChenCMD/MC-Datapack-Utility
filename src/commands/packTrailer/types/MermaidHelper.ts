import { CallNode, getLabel, getType } from './CallNode'
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

export type GraphDefinition = `${CallNode}@{ label: ${EscapedChar}, shape: ${GraphShape} }`
export type GraphRelation = `${CallNode} --> ${CallNode}`
type GraphClick = `click ${CallNode} callback "Jump to ${string}"`

export type Graph = {
  /** definitions */
  def: Set<GraphDefinition>

  /** relations */
  rel: Set<GraphRelation>

  /** click events */
  click: Set<GraphClick>
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

export function makeGraphDefinition(node: CallNode): GraphDefinition {
  return `${node}@{ label: "${getLabel(node)}", shape: "${getShape(getType(node))}" }` as GraphDefinition
}

export function makeGraphRelation(from: CallNode, to: CallNode): GraphRelation {
  return `${from} --> ${to}`
}

export function makeGraphClick(nodes: CallNode[]): GraphClick[] {
  return nodes
    .filter(node => isFileType(getType(node)))
    .map(node => `click ${node} callback "Jump to ${getLabel(node)}"` as GraphClick)
}
