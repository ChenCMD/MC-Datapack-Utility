import https from 'https';
import { Octokit } from '@octokit/rest';
import { ReposGetContentResponseData } from '@octokit/types/dist-types/generated/Endpoints';
import { OctokitResponse } from '@octokit/types/dist-types/OctokitResponse';
import { setTimeOut } from './common';
import { AskGitHubData } from '../types/AskGitHubData';

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

export async function getGitHubData(data: AskGitHubData): Promise<ReposGetContentResponseData[]> {
    const octokit = new Octokit();
    const files = await Promise.race([
        octokit.repos.getContent({
            owner: data.owner,
            repo: data.repo,
            ref: data.ref,
            path: data.path
        }) as unknown as OctokitResponse<ReposGetContentResponseData[]>,
        setTimeOut<OctokitResponse<ReposGetContentResponseData[]>>(7000)
    ]);
    return files.data;
}