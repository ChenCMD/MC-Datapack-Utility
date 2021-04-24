import { WorkspaceConfiguration } from 'vscode';
import { CustomQuestion } from '../commands/createDatapackTemplate/types/CustomQuestion';
import { QuickPickFiles } from '../commands/createDatapackTemplate/types/QuickPickFiles';
import { Template } from '../commands/createFile/types/Template';
import { OperateElement } from '../commands/scoreOperation/types/OperateTable';

export interface Config {
    env: EnvironmentConfig
    scoreOperation: ScoreOperationConfig
    createDatapackTemplate: CreateDatapackTemplateConfig
    createFile: CreateFileConfig
}

export interface EnvironmentConfig {
    language: 'Default' | 'en' | 'ja' | 'zh-cn' | 'zh-tw'
    dateFormat: string
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
    customQuestion: CustomQuestion[]
}

export interface CreateFileConfig {
    fileTemplate: Template
}

export const defaultConfig: Config = {
    env: {
        language: 'Default',
        dateFormat: 'm/dd HH:MM',
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
        customTemplate: [],
        customQuestion: []
    },
    createFile: {
        fileTemplate: {}
    }
};

export function constructConfig(custom: WorkspaceConfiguration, base = defaultConfig): Config {
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
        }
    };
    console.log('config loaded.');
    console.log(JSON.stringify(config));
    return config;
}