/**
 * @license
 * MIT License
 *
 * Copyright (c) 2019-2020 SPGoding
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ReposGetContentResponseData } from '@octokit/types/dist-types/generated/Endpoints';
import { codeConsole } from '../extension';
import { AskGitHubData } from '../types/AskGitHubData';
import { FileDataReqContent } from '../types/FileData';
import { VersionInformation } from '../types/VersionInformation';
import { setTimeOut } from './common';
import { download, getGitHubData } from './downloader';

export async function getVanillaData(
    versionOrLiteral: string,
    versionInfo: VersionInformation | undefined,
    askGitHubdata: AskGitHubData,
    relProcessingFunc: (data: ReposGetContentResponseData) => string,
    elementFunc: (index: number, max: number) => void
): Promise<FileDataReqContent[]> {
    askGitHubdata.ref = askGitHubdata.ref.replace(/%version%/, resolveVersion(versionOrLiteral, versionInfo));

    const files = await getGitHubData(askGitHubdata);
    const ans: FileDataReqContent[] = [];

    for (const [i, file] of files.entries()) {
        const content = await Promise.race([
            download(file.download_url),
            setTimeOut<string>(7000)
        ]);
        ans.push({
            rel: relProcessingFunc(file),
            content: content.split('\n')
        });
        elementFunc(i, files.length);
    }
    return ans;
}

function resolveVersion(versionOrLiteral: string, versionInformation: VersionInformation | undefined) {
    if (!versionInformation)
        return '1.16.4';
    switch (versionOrLiteral.toLowerCase()) {
        case 'latest snapshot':
            return versionInformation.latestSnapshot;
        case 'latest release':
            return versionInformation.latestRelease;
        default:
            return versionOrLiteral;
    }
}

export async function getLatestVersions(): Promise<VersionInformation | undefined> {
    let ans: VersionInformation | undefined;
    try {
        codeConsole.appendLine('[LatestVersions] Fetching the latest versions...');
        const str = await Promise.race([
            download('https://launchermeta.mojang.com/mc/game/version_manifest.json'),
            setTimeOut<string>(7000)
        ]);
        const { latest: { release, snapshot }, versions }: { latest: { release: string, snapshot: string }, versions: { id: string }[] } = JSON.parse(str);
        const processedVersion = '1.16.2';
        const processedVersionIndex = versions.findIndex(v => v.id === processedVersion);
        const processedVersions = processedVersionIndex >= 0 ? versions.slice(0, processedVersionIndex + 1).map(v => v.id) : [];
        ans = (release && snapshot) ? { latestRelease: release, latestSnapshot: snapshot, processedVersions } : undefined;
    } catch (e) {
        codeConsole.appendLine(`[LatestVersions] ${e}`);
    }
    return ans;
}