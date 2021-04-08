import { locale } from '../../../locales';
import { AddTemplateGenNode, CreateTemplateGenNode, GenNodes } from '../nodes';

export function getGenTypeMap(): Map<string, GenNodes> {
    const res = new Map<string, GenNodes>();
    res.set(locale('create-datapack-template.add'), AddTemplateGenNode);
    res.set(locale('create-datapack-template.create'), CreateTemplateGenNode);
    return res;
}