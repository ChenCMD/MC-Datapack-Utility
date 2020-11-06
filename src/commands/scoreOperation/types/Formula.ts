import { OperateElement } from './OperateTable';

export interface Formula {
    front: string | Formula
    op: OperateElement
    back: string | Formula
}