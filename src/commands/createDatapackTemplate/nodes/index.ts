import { AddTemplateGenNode } from './AddTemplateGenNode';
import { CreateTemplateGenNode } from './CreateTemplateGenNode';

export * from './AddTemplateGenNode';
export * from './CreateTemplateGenNode';

export type GenNodes =
    | typeof AddTemplateGenNode
    | typeof CreateTemplateGenNode;

export function getGenTypeMap(): Map<string, GenNodes> {
    return new Map<string, GenNodes>([
        ['create-datapack-template.add', AddTemplateGenNode],
        ['create-datapack-template.create', CreateTemplateGenNode]
    ]);
}