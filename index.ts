import * as shotPool from './lib/shot-pool';
import * as Logger from 'log4js';
import * as express from 'express';
import * as internalIp from 'internal-ip';

process.env.loglevel = process.env.loglevel || 'INFO';
process.env.webshotDebugPort = process.env.webshotDebugPort || '3030';
Logger.setGlobalLogLevel(process.env.loglevel);
let app = express();
let ip;
internalIp.v4().then(_ip => ip = _ip);

export interface Config extends shotPool.PoolConfig {

}

let defaultConfig: Config = {
    concurrency: 10,
    callbackName: 'callPhantom',
    warmerUrl: '',
    width: 800,
    height: 600
};

export async function init(options: Config) {
    options = Object.assign({}, defaultConfig, options);
    return shotPool.create(
        options
    );
}

export function getShot(url: string): PromiseLike<Buffer> {
    return shotPool.getShot(url);
}

app.get('/status', (req, res) => {
    let status = shotPool.getStatus();
    let workerDetails = status.allWorkers.map(worker => {
        let workerStatus = worker.getStatus();
        return `<div>Worker Id: #${workerStatus.id}<div>
            <div>ConnectWS: ${workerStatus.browser.wsEndpoint()}<div>
            <div>DebugLink: <a href='http://${ip}:${workerStatus.debugPort}'>http://${ip}:${workerStatus.debugPort}</a></div>
            <br>
        `;
    });
    res.end(`
        <html>
                <style>
                        
                </style>
                <title>Webshot Factory Status</title>
                <body>
                        <h1>Webshot Factory Status</h1>
                        <h3>Job Queue</h3>
                        <div>Number of Jobs in queue: ${status.jobQueue.getStatus().jobs.length}</div>
                        <div>Total Jobs processed: ${status.jobQueue.getStatus().total}</div>

                        <h3>Workers</h3>
                        <div>Total Workers: ${status.allWorkers.length}</div>
                        <div>Idle Workers: ${status.idleWorkers.length}</div>
                        <h4>Worker details</h4>
                        ${workerDetails}
                </body>
        </html>
    `)
});

app.listen(parseInt(process.env.webshotDebugPort), ip);