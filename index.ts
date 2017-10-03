import * as shotPool from './lib/shot-pool';
import * as Logger from 'log4js';

process.env.loglevel = process.env.loglevel || 'INFO';
Logger.setGlobalLogLevel(process.env.loglevel);

export interface Config extends shotPool.PoolConfig {

}

let defaultConfig: Config = {
    concurrency: 10,
    callbackName: 'callPhantom',
    warmerUrl: '',
    width: 800,
    height: 600
};

export function init(options: Config) {
    options = Object.assign({}, defaultConfig, options);
    shotPool.create(
        options
    );
}

export function getShot(url: string): PromiseLike<Buffer> {
    return shotPool.getShot(url);
}