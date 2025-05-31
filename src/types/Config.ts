import { WorkspaceConfiguration } from 'vscode'
import { QuickPickFiles } from '../commands/createDatapackTemplate/types/QuickPickFiles'
import { Template } from '../commands/createFile/types/Template'
import { OperateElement } from '../commands/scoreOperation/types/OperateTable'

export interface Config {
  env: EnvironmentConfig
  scoreOperation: ScoreOperationConfig
  createDatapackTemplate: CreateDatapackTemplateConfig
  createFile: CreateFileConfig
  mcfFormatter: McfFormatterConfig
}

export interface EnvironmentConfig {
  language: 'Default' | 'en' | 'ja' | 'zh-cn' | 'zh-tw'
  dateFormat: string
  detectionDepth: number
  dataVersion: string
}

export interface ScoreOperationConfig {
  prefix: string
  objective: string
  temp: string
  forceInputType: 'Default' | 'Always Selection' | 'Always InputBox'
  isAlwaysSpecifyObject: boolean
  customOperate: OperateElement[]
  valueScale: number
}

export interface CreateDatapackTemplateConfig {
  defaultLoadAndTick: boolean
  defaultVanillaData: boolean
  defaultFolder: boolean
  customTemplate: QuickPickFiles[]
}

export interface CreateFileConfig {
  fileTemplate: Template
}

export interface McfFormatterConfig {
  doInsertIMPDocument: boolean
}

export const defaultConfig: Config = {
  env: {
    language: 'Default',
    dateFormat: 'm/dd HH:MM',
    detectionDepth: 1,
    dataVersion: 'Latest release'
  },
  scoreOperation: {
    prefix: '$MCDUtil_',
    objective: '_',
    temp: 'Temp_',
    forceInputType: 'Default',
    isAlwaysSpecifyObject: true,
    customOperate: [],
    valueScale: 1
  },
  createDatapackTemplate: {
    defaultLoadAndTick: true,
    defaultVanillaData: true,
    defaultFolder: true,
    customTemplate: []
  },
  createFile: {
    fileTemplate: {}
  },
  mcfFormatter: {
    doInsertIMPDocument: false
  }
}

export const constructConfig = (custom: WorkspaceConfiguration, base = defaultConfig): Config => {
  const config = {
    env: {
      ...base.env, ...custom.env || {}
    },
    scoreOperation: {
      ...base.scoreOperation, ...custom.scoreOperation || {}
    },
    createDatapackTemplate: {
      ...base.createDatapackTemplate, ...custom.createDatapackTemplate || {}
    },
    createFile: {
      ...base.createFile, ...custom.createFile || {}
    },
    mcfFormatter: {
      ...base.mcfFormatter, ...custom.mcfFormatter || {}
    }
  }
  console.log('config loaded.')
  console.log(JSON.stringify(config))
  return config
}
