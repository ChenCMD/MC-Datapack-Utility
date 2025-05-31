import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { setTimeOut } from '../utils';

type TemporaryType = RestEndpointMethodTypes['repos']['getContent']['parameters'];

export interface AskGitHubData extends TemporaryType {
    owner: string
    repo: string
    ref: string
    path: string
}

type GetElem<T> = T extends unknown[] ? T[number] : T;

export type ReposGetContentResponseData = GetElem<RestEndpointMethodTypes['repos']['getContent']['response']['data']>;

export const getGitHubData = async (data: AskGitHubData): Promise<RestEndpointMethodTypes['repos']['getContent']['response']['data']> => {
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
