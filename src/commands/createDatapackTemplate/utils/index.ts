import { GenerateFileData, QuickPickFiles } from '../types/QuickPickFiles';

export function resolveVars(str: string, namespace: string, resourcePath: string): string {
    str = resolveNamespace(str, namespace);
    str = resolveResourcePath(str, resourcePath);
    return str;
}

export function resolveNamespace(str: string, namespace: string): string {
    return str.replace(/%namespace%/ig, namespace);
}

export function resolveResourcePath(str: string, resourcePath: string): string {
    return str.replace(/%resourcePath%/ig, resourcePath);
}

export function resolveDatapackDiscription(str: string, datapackDiscription: string): string {
    return str.replace(/%datapackDiscription%/ig, datapackDiscription);
}

export const packMcMetaFileData: GenerateFileData = {
    type: 'file',
    relativeFilePath: 'pack.mcmeta',
    content: [
        '{',
        '    "pack": {',
        '        "pack_format": 6,',
        '        "description": "%datapackDiscription%"',
        '    }',
        '}'
    ]
};

export const defaultItems: QuickPickFiles[] = [
    // {// TODO
    //     label: `vanilla tags`,
    //     changes: []
    // },
    {
        label: '#load.json & %namespace%:load.mcfunction',
        picked: true,
        changes: [
            {
                type: 'file',
                relativeFilePath: 'data/minecraft/tags/functions/load.json',
                content: [
                    '{',
                    '    "values": [',
                    '        "%namespace%:load"',
                    '    ]',
                    '}'
                ]
            },
            {
                type: 'file',
                relativeFilePath: 'data/%namespace%/functions/load.mcfunction',
                content: ['']
            }
        ]
    },
    {
        label: '#tick.json & %namespace%:tick.mcfunction',
        picked: true,
        changes: [
            {
                type: 'file',
                relativeFilePath: 'data/minecraft/tags/functions/tick.json',
                content: [
                    '{',
                    '    "values": [',
                    '        "%namespace%:tick"',
                    '    ]',
                    '}'
                ]
            },
            {
                type: 'file',
                relativeFilePath: 'data/%namespace%/functions/tick.mcfunction',
                content: ['']
            }
        ]
    },
    {
        label: 'data/%namespace%/advancements/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/advancements/'
            }
        ]
    },
    {
        label: 'data/%namespace%/dimensions/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/dimensions/'
            }
        ]
    },
    {
        label: 'data/%namespace%/dimension_types/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/dimension_types/'
            }
        ]
    },
    {
        label: 'data/%namespace%/loot_tables/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/loot_tables/'
            }
        ]
    },
    {
        label: 'data/%namespace%/predicates/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/predicates/'
            }
        ]
    },
    {
        label: 'data/%namespace%/recipes/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/recipes/'
            }
        ]
    },
    {
        label: 'data/%namespace%/tags/blocks/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/tags/blocks/'
            }
        ]
    },
    {
        label: 'data/%namespace%/tags/entity_types/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/tags/entity_types/'
            }
        ]
    },
    {
        label: 'data/%namespace%/tags/fluids/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/tags/fluids/'
            }
        ]
    },
    {
        label: 'data/%namespace%/tags/functions/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/tags/functions/'
            }
        ]
    },
    {
        label: 'data/%namespace%/tags/items/',
        changes: [
            {
                type: 'folder',
                relativeFilePath: 'data/%namespace%/tags/items/'
            }
        ]
    }
];