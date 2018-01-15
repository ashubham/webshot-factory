import * as shotPool from './lib/shot-pool';
import * as Logger from 'log4js';
import * as express from 'express';
import * as internalIp from 'internal-ip';

process.env.loglevel = process.env.loglevel || 'INFO';
process.env.webshotDebugPort = process.env.webshotDebugPort || '3030';
Logger.setGlobalLogLevel(process.env.loglevel);
let app = express();
let ip;
let _logger = Logger.getLogger("index");

internalIp.v4().then(_ip => ip = _ip);

export interface Config extends shotPool.PoolConfig {
    webshotDebugPort?: string;
}

let defaultConfig: Config = {
    concurrency: 10,
    callbackName: '',
    warmerUrl: '',
    width: 800,
    height: 600,
    timeout: 60000,
    webshotDebugPort: process.env.webshotDebugPort
};

let passedConfig : Config;

export async function init(options: Config) {
    options = Object.assign({}, defaultConfig, options);
    passedConfig = options;
    await shotPool.create(
        options
    );
    app.listen(parseInt(passedConfig.webshotDebugPort), ip);
    _logger.info('Listening on debug port', passedConfig.webshotDebugPort, ip);
    return shotPool;
}

export function getShot(url: string): PromiseLike<Buffer> {
    return shotPool.getShot(url);
}

app.get('/status', (req, res) => {
    let status = shotPool.getStatus();
    let workerDetails = status.allWorkers.map(worker => {
        let workerStatus = worker.getStatus();
        let link = `http://${ip}:${workerStatus.debugPort}`;
        return `
            <div class="worker ${workerStatus.isBusy ? 'busy': 'free'}">
                <div>Worker Id: <b>#${workerStatus.id}</b></div>
                <div>ConnectWS: ${workerStatus.browser.wsEndpoint()}</div>
                <div>DebugLink:
                    <a href='${link}'>
                        ${link}
                    </a>
                </div>
            </div>
        `;
    }).join('');
    res.end(`
        <html>
                <style>
                        .worker {
                            margin: 10px;
                            width: 700px;
                            padding: 10px;
                            border-radius: 5px;
                            box-shadow: 2px 2px #d3d3d8;
                        }
                        .busy {
                            background-color: #fff3d4;
                        }
                        .free {
                            background-color: #5fba7d;
                        }
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