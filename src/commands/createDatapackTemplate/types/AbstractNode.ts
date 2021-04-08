export abstract class AbstractNode {
    abstract readonly isGeneratePackMcMeta: boolean;

    abstract listenGenerateDir(): Promise<string>;

    abstract listenDatapackNameAndRoot(directory: string): Promise<{ name: string; root: string }>;

    abstract listenDatapackDescription(directory: string): Promise<string>;
}