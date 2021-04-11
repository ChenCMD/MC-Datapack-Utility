import { RestEndpointMethodTypes } from '@octokit/rest';
import { components } from '@octokit/openapi-types/dist-types/generated/types';

type TemporaryType = RestEndpointMethodTypes['repos']['getContent']['parameters'];

export interface AskGitHubData extends TemporaryType {
    owner: string
    repo: string
    ref: string
    path: string
}

export type ReposGetContentResponseData = components['schemas']['content-directory'][number];