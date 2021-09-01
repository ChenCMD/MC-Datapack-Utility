import { AddTemplateGenNode } from './AddTemplateGenNode';
import { CreateTemplateGenNode } from './CreateTemplateGenNode';

export * from './AddTemplateGenNode';
export * from './CreateTemplateGenNode';

export type GenNodes =
    | typeof AddTemplateGenNode
    | typeof CreateTemplateGenNode;

export function getGenTypeMap(): Map<string, GenNodes> {
    const res = new Map<string, GenNodes>();
    res.set('create-datapack-template.add', AddTemplateGenNode);
    res.set('create-datapack-template.create', CreateTemplateGenNode);
    return res;
}