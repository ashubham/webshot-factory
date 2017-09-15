import * as shotPool from './lib/shot-pool';
export function init(concurrency: number = 10, callbackName = 'callPhantom', warmerUrl = '') {
    shotPool.create(concurrency, callbackName, warmerUrl);
}

export function getShot(url: string): PromiseLike<Buffer> {
    return shotPool.getShot(url);
}