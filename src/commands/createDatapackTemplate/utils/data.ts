/* eslint-disable @typescript-eslint/naming-convention */
import { migrateFilePath, ReposGetContentResponseData } from '../../../types'
import { GenerateFileData, GetGitHubDataFunc, QuickPickFiles } from '../types/QuickPickFiles'

export const packMcMetaData: (packFormat: number) => GenerateFileData = pack_format => ({
  type: 'file',
  rel: 'pack.mcmeta',
  content: {
    pack: {
      pack_format,
      description: '%datapackDescription%'
    }
  }
})

export const dataFolder: GenerateFileData = {
  type: 'folder',
  rel: 'data/'
}

export const pickItems: (packFormat: number) => { [key in '#load & #tick' | 'Vanilla data' | 'Folders']: QuickPickFiles[] } = pack_format => {
  const templates: { [key in '#load & #tick' | 'Vanilla data' | 'Folders']: QuickPickFiles[] } = {
    '#load & #tick': [
      {
        label: '#load.json & %namespace%:load.mcfunction',
        picked: true,
        generates: [
          {
            type: 'file',
            rel: 'data/minecraft/tags/function/load.json',
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
            rel: 'data/%namespace%/function/load.mcfunction',
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
            rel: 'data/minecraft/tags/function/tick.json',
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
            rel: 'data/%namespace%/function/tick.mcfunction',
            content: []
          }
        ]
      }
    ],
    'Vanilla data': [
      {
        label: 'All Vanilla tags/block',
        generates: [],
        func: [
          {
            owner: 'misode',
            repo: 'mcmeta',
            ref: '%version%-data',
            path: 'data/minecraft/tags/block/',
            rel: (data: ReposGetContentResponseData): string => data.path
          }
        ]
      },
      {
        label: 'All Vanilla tags/entity_type',
        generates: [],
        func: [
          {
            owner: 'misode',
            repo: 'mcmeta',
            ref: '%version%-data',
            path: 'data/minecraft/tags/entity_type/',
            rel: (data: ReposGetContentResponseData): string => data.path
          }
        ]
      },
      {
        label: 'All Vanilla tags/fluid',
        generates: [],
        func: [
          {
            owner: 'misode',
            repo: 'mcmeta',
            ref: '%version%-data',
            path: 'data/minecraft/tags/fluid/',
            rel: (data: ReposGetContentResponseData): string => data.path
          }
        ]
      },
      {
        label: 'All Vanilla tags/item',
        generates: [],
        func: [
          {
            owner: 'misode',
            repo: 'mcmeta',
            ref: '%version%-data',
            path: 'data/minecraft/tags/item/',
            rel: (data: ReposGetContentResponseData): string => data.path
          }
        ]
      }
    ],
    'Folders': [
      {
        label: 'data/%namespace%/advancement/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/advancement/'
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
        label: 'data/%namespace%/function/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/function/'
          }
        ]
      },
      {
        label: 'data/%namespace%/item_modifier/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/item_modifier/'
          }
        ]
      },
      {
        label: 'data/%namespace%/loot_table/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/loot_table/'
          }
        ]
      },
      {
        label: 'data/%namespace%/predicate/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/predicate/'
          }
        ]
      },
      {
        label: 'data/%namespace%/recipe/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/recipe/'
          }
        ]
      },
      {
        label: 'data/%namespace%/structure/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/structure/'
          }
        ]
      },
      {
        label: 'data/%namespace%/tags/block/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/tags/block/'
          }
        ]
      },
      {
        label: 'data/%namespace%/tags/entity_type/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/tags/entity_type/'
          }
        ]
      },
      {
        label: 'data/%namespace%/tags/fluid/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/tags/fluid/'
          }
        ]
      },
      {
        label: 'data/%namespace%/tags/function/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/tags/function/'
          }
        ]
      },
      {
        label: 'data/%namespace%/tags/game_event/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/tags/game_event/'
          }
        ]
      },
      {
        label: 'data/%namespace%/tags/item/',
        generates: [
          {
            type: 'folder',
            rel: 'data/%namespace%/tags/item/'
          }
        ]
      }
    ]
  }

  return {
    '#load & #tick': templates['#load & #tick'].flatMap(item => {
      const generates = item.generates.flatMap(generate => {
        const rel = migrateFilePath(generate.rel, pack_format)
        return rel ? [{ ...generate, rel }] : []
      })
      return generates.length > 1 ? [{ ...item, generates }] : []
    }),
    'Vanilla data': templates['Vanilla data'].flatMap(item => {
      if (item.func) {
        const func = item.func.flatMap(f => {
          const path = migrateFilePath(f.path, pack_format)
          return path ? [{ ...f, path } satisfies GetGitHubDataFunc] : []
        })
        return func ? [{ ...item, func }] : []
      } else {
        return item
      }
    }),
    'Folders': templates['Folders'].flatMap(item => {
      const label = migrateFilePath(item.label, pack_format)
      const generates = item.generates.flatMap(generate => {
        const rel = migrateFilePath(generate.rel, pack_format)
        return rel ? [{ ...generate, rel }] : []
      })
      return (label && generates) ? [{ ...item, label, generates }] : []
    })
  }
}
