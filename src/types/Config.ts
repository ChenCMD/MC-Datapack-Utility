import { WorkspaceConfiguration } from 'vscode';
import { QuickPickFiles } from '../commands/createDatapackTemplate/types/QuickPickFiles';
import { Template } from '../commands/createFile/types/Template';
import { OperateElement } from '../commands/scoreOperation/types/OperateTable';

export interface Config {
    language: 'Default' | 'en' | 'ja' | 'zh-cn' | 'zh-tw',
    dateFormat: string,
    scoreOperation: {
        prefix: string
        objective: string
        temp: string
        forceInputType: 'Default' | 'Always Selection' | 'Always InputBox'
        isAlwaysSpecifyObject: boolean
        customOperate: OperateElement[]
        valueScale: number
    },
    createDatapackTemplate: {
        dataVersion: string
        customTemplate: QuickPickFiles[]
    },
    createFile: {
        fileTemplate: Template
    }
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
        customTemplate: []
    },
    createFile: {
        fileTemplate: {}
    }
};

export function constructConfig(custom: WorkspaceConfiguration, base = defaultConfig): Config {
    const scoreOperation = custom.scoreOperation || {};
    const createDatapackTemplate = custom.createDatapackTemplate || {};
    const createFile = custom.createFile || {};
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
        }
    };
    return config;
}