import { FeatureContext } from '../../../types/FeatureContext';

export type Replacer = (insertString: string, insertCount: number, ctx: FeatureContext) => Promise<string[]>;