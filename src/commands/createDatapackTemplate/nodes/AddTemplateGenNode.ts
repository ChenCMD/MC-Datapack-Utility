import path from 'path';
import { locale } from '../../../locales';
import { GenerateError } from '../../../types/Error';
import { isDatapackRoot } from '../../../utils/common';
import { readFile } from '../../../utils/file';
import { listenDir } from '../../../utils/vscodeWrapper';
import { AbstractNode } from '../types/AbstractNode';

export class AddTemplateGenNode extends AbstractNode {
    readonly isGeneratePackMcMeta = false;

    async listenGenerateDir(): Promise<string> {
        const dir = await listenDir(
            locale('create-datapack-template.dialog-title-datapack'),
            locale('select')
        ).then(v => v.fsPath);

        if (!await isDatapackRoot(dir)) throw new GenerateError(locale('create-datapack-template.not-datapack'));
        return dir;
    }

    listenDatapackNameAndRoot(directory: string): Promise<{ name: string; root: string }> {
        const name = path.basename(directory);
        const root = directory;
        return Promise.resolve({ name, root });
    }

    async listenPackFormat(directory: string): Promise<number> {
        try {
            const pf = JSON.parse(await readFile(path.join(directory, 'pack.mcmeta'))).pack?.pack_format;
            if (typeof pf !== 'number')
                throw new GenerateError(locale('create-datapack-template.no-pack-format'));
            return pf;
        } catch (err) {
            throw new GenerateError(locale('create-datapack-template.no-pack-format'));
        }
    }

    async listenDatapackDescription(directory: string): Promise<string> {
        try {
            return JSON.parse(await readFile(path.join(directory, 'pack.mcmeta'))).pack?.description ?? '';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err instanceof SyntaxError) return '';
            throw err;
        }
    }
}