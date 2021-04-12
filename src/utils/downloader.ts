import https from 'https';

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