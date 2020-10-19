export interface VariableContainer {
    [key: string]: string
}

export function resolveVars(str: string, variables: VariableContainer): string {
    return str.replace(/%.+%/g, match => variables[match.slice(1, -1)] ?? match);
}