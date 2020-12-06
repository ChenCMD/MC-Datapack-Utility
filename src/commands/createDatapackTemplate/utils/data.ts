/* eslint-disable @typescript-eslint/naming-convention */
import { ReposGetContentResponseData } from '@octokit/types/dist-types/generated/Endpoints';
import { GenerateFileData, QuickPickFiles } from '../types/QuickPickFiles';

export const packMcMetaData: GenerateFileData = {
    type: 'file',
    rel: 'pack.mcmeta',
    content: {
        pack: {
            pack_format: 6,
            description: '%datapackDescription%'
        }
    }
};

export const pickItems: { [key in '#load & #tick' | 'Vanilla data' | 'Folders']: QuickPickFiles[] } = {
    '#load & #tick': [
        {
            label: '#load.json & %namespace%:load.mcfunction',
            picked: true,
            generates: [
                {
                    type: 'file',
                    rel: 'data/minecraft/tags/functions/load.json',
                    content: {
                        values: [
                            '%namespace%:load'
                        ]
                    },
                    append: {
                        key: 'values',
                        elem: '%namespace%:load'
                    }
                },
                {
                    type: 'file',
                    rel: 'data/%namespace%/functions/load.mcfunction',
                    content: []
                }
            ]
        },
        {
            label: '#tick.json & %namespace%:tick.mcfunction',
            picked: true,
            generates: [
                {
                    type: 'file',
                    rel: 'data/minecraft/tags/functions/tick.json',
                    content: {
                        values: [
                            '%namespace%:tick'
                        ]
                    },
                    append: {
                        key: 'values',
                        elem: '%namespace%:tick'
                    }
                },
                {
                    type: 'file',
                    rel: 'data/%namespace%/functions/tick.mcfunction',
                    content: []
                }
            ]
        }
    ],
    'Vanilla data': [
        {
            label: 'All Vanilla tags/blocks',
            generates: [],
            func: [
                {
                    owner: 'SPGoding',
                    repo: 'vanilla-datapack',
                    ref: '%version%-data',
                    path: 'data/minecraft/tags/blocks',
                    rel: (data: ReposGetContentResponseData): string => data.path
                }
            ]
        },
        {
            label: 'All Vanilla tags/entity_types',
            generates: [],
            func: [
                {
                    owner: 'SPGoding',
                    repo: 'vanilla-datapack',
                    ref: '%version%-data',
                    path: 'data/minecraft/tags/entity_types',
                    rel: (data: ReposGetContentResponseData): string => data.path
                }
            ]
        },
        {
            label: 'All Vanilla tags/fluids',
            generates: [],
            func: [
                {
                    owner: 'SPGoding',
                    repo: 'vanilla-datapack',
                    ref: '%version%-data',
                    path: 'data/minecraft/tags/fluids',
                    rel: (data: ReposGetContentResponseData): string => data.path
                }
            ]
        },
        {
            label: 'All Vanilla tags/items',
            generates: [],
            func: [
                {
                    owner: 'SPGoding',
                    repo: 'vanilla-datapack',
                    ref: '%version%-data',
                    path: 'data/minecraft/tags/items',
                    rel: (data: ReposGetContentResponseData): string => data.path
                }
            ]
        }
    ],
    'Folders': [
        {
            label: 'data/%namespace%/advancements/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/advancements/'
                }
            ]
        },
        {
            label: 'data/%namespace%/dimension/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/dimension/'
                }
            ]
        },
        {
            label: 'data/%namespace%/dimension_type/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/dimension_type/'
                }
            ]
        },
        {
            label: 'data/%namespace%/loot_tables/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/loot_tables/'
                }
            ]
        },
        {
            label: 'data/%namespace%/predicates/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/predicates/'
                }
            ]
        },
        {
            label: 'data/%namespace%/recipes/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/recipes/'
                }
            ]
        },
        {
            label: 'data/%namespace%/tags/blocks/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/tags/blocks/'
                }
            ]
        },
        {
            label: 'data/%namespace%/tags/entity_types/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/tags/entity_types/'
                }
            ]
        },
        {
            label: 'data/%namespace%/tags/fluids/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/tags/fluids/'
                }
            ]
        },
        {
            label: 'data/%namespace%/tags/functions/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/tags/functions/'
                }
            ]
        },
        {
            label: 'data/%namespace%/tags/items/',
            generates: [
                {
                    type: 'folder',
                    rel: 'data/%namespace%/tags/items/'
                }
            ]
        }
    ]
};