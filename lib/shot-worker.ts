import * as _ from 'lodash';
import * as puppeteer from 'puppeteer';
import * as Logger from 'log4js';
import * as P from 'bluebird';

let _logger = Logger.getLogger("shot-worker");
_logger.setLevel('INFO');

export enum ShotWorkerStatus {

}

export class ShotWorker {
    public creationTime: number;
    private browser;
    private page;
    private shotCallback: (err, buffer: Buffer) => void = _.noop;
    private isBusy: boolean = true;
    constructor() {
        
    }

    public static async create(idx: number = 0,
                               callbackName: string = 'callPhantom',
                               warmerUrl:string = '') {
        let start = (new Date()).valueOf();
        let worker = new ShotWorker();
        worker.browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: false,
            args: ['--ignore-certificate-errors'],
            userDataDir: '/tmp/chrome'
        });
        worker.page = await worker.browser.newPage();

        worker.page.on('console', (...args) => _logger.debug('PAGE LOG:', ...args));
        worker.page.on('response', r => _logger.debug(r.status + ' ' + r.url));

        // Define a window.onCustomEvent function on the page.  
        await worker.page.exposeFunction(callbackName, e => {
            _logger.debug('Callback called from browser with', e);
            return worker.page.screenshot().then((buffer: Buffer) => {
                worker.shotCallback(null, buffer);
                worker.isBusy = false;
            }, (err) => {
                worker.shotCallback(err, null);
                worker.isBusy = false;
            });
        });

        if (warmerUrl) {
            await worker.page.goto(warmerUrl, { waitUntil: 'networkIdle' });
        }

        _logger.info(`Worker ${idx} ready`);
        worker.creationTime = (new Date()).valueOf() - start;
        worker.isBusy = false;
        return worker;
    }

    public takeShot(url: string): P<Buffer> {
        if (this.isBusy) {
            _logger.error('Worker is busy doing work');
            return P.reject('Worker is already busy');
        }
        let start = (new Date()).valueOf();
        _logger.debug('screenshot url', url);
        return new P<Buffer>((resolve, reject) => {
            this.shotCallback = (err, buffer: Buffer) => {
                if (err) {
                    return reject(err);
                }
                resolve(buffer);
            };
            this.page.goto(url, { waitUntil: 'networkIdle' });
        });
    }

    public reload() {
        return this.page.reload();
    }
}