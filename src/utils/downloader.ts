import https from 'https';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { setTimeOut } from './common';
import { AskGitHubData } from '../types/OctokitWrapper';

export async function download(uri: string): Promise<string> {
    return await new Promise((resolve, reject) => {
        https.get(uri, res => {
            let body = '';
            res.on('data', chunk => {
                body += chunk;
            });
            res.on('error', reject);
            res.on('end', () => {
                resolve(body);
            });
        }).end();
    });
}

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