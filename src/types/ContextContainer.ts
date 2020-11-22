const contexts = [
    'dir',
    'datapackRoot',
    'datapackName',
    'datapackDescription',
    'namespace',
    'fileResourcePath',
    'fileName',
    'fileType',
    'fileExtname',
    'nowOpenFileType',
    'nowOpenFileResourcePath',
    'nowOpenFileName',
    'nowOpenFileExtname',
    'date',
    'cursor'
] as const;

type Context = typeof contexts[number];

export type ContextContainer = {
    [key in Context]?: string
};

export function resolveVars(str: string, ctxContainer: ContextContainer): string {
    return str.replace(/%.+?%/g, match => {
        const key = match.slice(1, -1);
        for (const safeKey of contexts) {
            if (key === safeKey)
                return ctxContainer[key] ?? '';
        }
        return match;
    });
}