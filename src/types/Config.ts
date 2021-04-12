import { WorkspaceConfiguration } from 'vscode';
import { CustomQuestion } from '../commands/createDatapackTemplate/types/CustomQuestion';
import { QuickPickFiles } from '../commands/createDatapackTemplate/types/QuickPickFiles';
import { Template } from '../commands/createFile/types/Template';
import { OperateElement } from '../commands/scoreOperation/types/OperateTable';

export interface Config {
    language: 'Default' | 'en' | 'ja' | 'zh-cn' | 'zh-tw'
    dateFormat: string
    scoreOperation: ScoreOperationConfig
    createDatapackTemplate: CreateDatapackTemplateConfig
    createFile: CreateFileConfig
    mcfFormatter: McfFormatterConfig
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
    dataVersion: string
    defaultLoadAndTick: boolean
    defaultVanillaData: boolean
    defaultFolder: boolean
    customTemplate: QuickPickFiles[]
    customQuestion: CustomQuestion[]
}

export interface CreateFileConfig {
    fileTemplate: Template
}

export interface McfFormatterConfig {
    doInsertIMPDocument: boolean
}

export const defaultConfig: Config = {
    language: 'Default',
    dateFormat: 'm/dd HH:MM',
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
        dataVersion: 'Latest release',
        defaultLoadAndTick: true,
        defaultVanillaData: true,
        defaultFolder: true,
        customTemplate: [],
        customQuestion: []
    },
    createFile: {
        fileTemplate: {}
    },
    mcfFormatter: {
        doInsertIMPDocument: false
    }
};

export function constructConfig(custom: WorkspaceConfiguration, base = defaultConfig): Config {
    const scoreOperation = custom.scoreOperation || {};
    const createDatapackTemplate = custom.createDatapackTemplate || {};
    const createFile = custom.createFile || {};
    const mcfFormatter = custom.mcfFormatter || {};
    const config = {
        language: custom.language || base.language,
        dateFormat: custom.dateFormat || base.dateFormat,
        scoreOperation: {
            ...base.scoreOperation, ...scoreOperation
        },
        createDatapackTemplate: {
            ...base.createDatapackTemplate, ...createDatapackTemplate
        },
        createFile: {
            ...base.createFile, ...createFile
        },
        mcfFormatter: {
            ...base.mcfFormatter, ...mcfFormatter
        }
    };
    console.log('config loaded.');
    console.log(JSON.stringify(config));
    return config;
}