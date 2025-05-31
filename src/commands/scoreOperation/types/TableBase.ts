export type TableBase<E extends ElementBase> = { [key in E['identifier']]: E }

export interface ElementBase {
  identifier: string
  type: 'op' | 'state'
}
