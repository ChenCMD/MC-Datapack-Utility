import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { components } from '@octokit/openapi-types/dist-types/generated/types';
import { setTimeOut } from '../utils';

type TemporaryType = RestEndpointMethodTypes['repos']['getContent']['parameters'];

export interface AskGitHubData extends TemporaryType {
    owner: string
    repo: string
    ref: string
    path: string
}

export type ReposGetContentResponseData = components['schemas']['content-directory'][number];

export async function getGitHubData(data: AskGitHubData): Promise<RestEndpointMethodTypes['repos']['getContent']['response']['data']> {
    const octokit = new Octokit();
    const files = await Promise.race([
        octokit.repos.getContent({
            owner: data.owner,
            repo: data.repo,
            ref: data.ref,
            path: data.path
        }),
        setTimeOut(7000)
    ]);
    return files.data;
}