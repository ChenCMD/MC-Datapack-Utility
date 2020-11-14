import https from 'https';
import { Octokit } from '@octokit/rest';
import { ReposGetContentResponseData } from '@octokit/types/dist-types/generated/Endpoints';
import { OctokitResponse } from '@octokit/types/dist-types/OctokitResponse';
import { setTimeOut } from './common';
import { GenerateFileData, GetGitHubDataFunc } from '../commands/createDatapackTemplate/types/QuickPickFiles';

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

export async function getGitHubData(data: GetGitHubDataFunc, elementFunc: (index: number, max: number) => void): Promise<GenerateFileData[]> {
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
    // コンパイラが雑魚
    const result: GenerateFileData[] = [];
    for (const file of files.data.map((v, i) => ({ index: i, value: v }))) {
        const content = await Promise.race([
            download(file.value.download_url),
            setTimeOut<string>(7000)
        ]);
        result.push({
            type: 'file',
            relativeFilePath: data.relativeFilePath(file.value),
            content: content.split('\n')
        });
        elementFunc(file.index, files.data.length);
    }
    return result;
}