import { Uri } from 'vscode';
import { Config, defaultConfig } from './Config';

export interface FeatureContext extends RequiredContext {
    config: Config
}

interface RequiredContext {
    extensionUri: Uri
}

export function createFeatureContext(context: Partial<FeatureContext> & RequiredContext): FeatureContext {
    return {
        config: context.config || defaultConfig,
        extensionUri: context.extensionUri
    };
}