import { locale } from '../../../locales';
import { AddTemplateGenNode } from './AddTemplateGenNode';
import { CreateTemplateGenNode } from './CreateTemplateGenNode';

export * from './AddTemplateGenNode';
export * from './CreateTemplateGenNode';

export type GenNodes =
    | typeof AddTemplateGenNode
    | typeof CreateTemplateGenNode;

export function getGenTypeMap(): Map<string, GenNodes> {
    const res = new Map<string, GenNodes>();
    res.set(locale('create-datapack-template.add'), AddTemplateGenNode);
    res.set(locale('create-datapack-template.create'), CreateTemplateGenNode);
    return res;
}