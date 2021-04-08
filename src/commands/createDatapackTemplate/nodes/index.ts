import { AddTemplateGenNode } from './AddTemplateGenNode';
import { CreateTemplateGenNode } from './CreateTemplateGenNode';

export * from './AddTemplateGenNode';
export * from './CreateTemplateGenNode';

export type GenNodes =
    | typeof AddTemplateGenNode
    | typeof CreateTemplateGenNode;