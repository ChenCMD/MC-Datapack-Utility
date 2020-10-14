import { QuickPickItem, Uri } from 'vscode';

export interface QuickPickFiles extends QuickPickItem {
    changes: {
        type: 'file' | 'folder'
        fileUri: Uri
        content?: string[]
    }[]
}

export function getPackMcmeta(dir: Uri, datapackDiscription: string): QuickPickFiles {
    return {
        label: 'create pack.mcmeta',
        changes: [
            {
                type: 'file',
                fileUri: Uri.joinPath(dir, 'pack.mcmeta'),
                content: [
                    '{',
                    '    "pack": {',
                    '        "pack_format": 6,',
                    `        "description": "${datapackDiscription}"`,
                    '    }',
                    '}'
                ]
            }
        ]
    };
}

export function getItems(namespace: string, dir: Uri, datapackName: string): QuickPickFiles[] {
    dir = Uri.joinPath(dir, datapackName, 'data');
    return [
        // {// TODO
        //     label: `vanilla tags`,
        //     changes: []
        // },
        {
            label: `#load.json & ${namespace}:load.mcfunction`,
            picked: true,
            changes: [
                {
                    type: 'file',
                    fileUri: Uri.joinPath(dir, 'minecraft/tags/functions/load.json'),
                    content: [
                        '{',
                        '    "value": [',
                        `        "${namespace}:load"`,
                        '    ]',
                        '}'
                    ]
                },
                {
                    type: 'file',
                    fileUri: Uri.joinPath(dir, `${namespace}/functions/load.mcfunction`),
                    content: ['']
                }
            ]
        },
        {
            label: `#tick.json & ${namespace}:tick.mcfunction`,
            picked: true,
            changes: [
                {
                    type: 'file',
                    fileUri: Uri.joinPath(dir, 'minecraft/tags/functions/tick.json'),
                    content: [
                        '{',
                        '    "value": [',
                        `        "${namespace}:tick"`,
                        '    ]',
                        '}'
                    ]
                },
                {
                    type: 'file',
                    fileUri: Uri.joinPath(dir, `${namespace}/functions/tick.mcfunction`),
                    content: ['']
                }
            ]
        },
        {
            label: `data/${namespace}/advancements/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/advancements/`)
                }
            ]
        },
        {
            label: `data/${namespace}/dimensions/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/dimensions/`)
                }
            ]
        },
        {
            label: `data/${namespace}/dimension_types/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/dimension_types/`)
                }
            ]
        },
        {
            label: `data/${namespace}/loot_tables/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/loot_tables/`)
                }
            ]
        },
        {
            label: `data/${namespace}/predicates/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/predicates/`)
                }
            ]
        },
        {
            label: `data/${namespace}/recipes/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/recipes/`)
                }
            ]
        },
        {
            label: `data/${namespace}/tags/blocks/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/tags/blocks/`)
                }
            ]
        },
        {
            label: `data/${namespace}/tags/entity_types/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/tags/entity_types/`)
                }
            ]
        },
        {
            label: `data/${namespace}/tags/fluids/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/tags/fluids/`)
                }
            ]
        },
        {
            label: `data/${namespace}/tags/functions/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/tags/functions/`)
                }
            ]
        },
        {
            label: `data/${namespace}/tags/items/`,
            changes: [
                {
                    type: 'folder',
                    fileUri: Uri.joinPath(dir, `${namespace}/tags/items/`)
                }
            ]
        }
    ];
}