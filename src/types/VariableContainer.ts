const variables = [
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

type Variable = typeof variables[number];

export type VariableContainer = {
    [key in Variable]?: string
};

export function resolveVars(str: string, varContainer: VariableContainer): string {
    return str.replace(/%.+?%/g, match => {
        const key = match.slice(1, -1);
        for (const safeKey of variables) {
            if (key === safeKey)
                return varContainer[key] ?? '';
        }
        return match;
    });
}