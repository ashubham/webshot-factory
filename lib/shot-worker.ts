import { WorkerConfig } from './../dist/declarations/lib/shot-worker.d';
import * as _ from 'lodash';
import * as puppeteer from 'puppeteer';
import * as Logger from 'log4js';
import * as P from 'bluebird';

let _logger = Logger.getLogger("shot-worker");
_logger.setLevel('INFO');

export interface WorkerConfig {
    callbackName?: string;
    warmerUrl?: string;
    width?: number;
    height?: number;
}

export class ShotWorker {
    public creationTime: number;
    private browser;
    private page;
    private shotCallback: (err, buffer: Buffer) => void = _.noop;
    private isBusy: boolean = true;
    constructor(public id: number) {

    }

    public static async create(idx: number, config: WorkerConfig) {
        let worker = new ShotWorker(idx);
        worker.init(idx, config.callbackName, config.warmerUrl, config.width, config.height);
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
            this.page.goto(url, { waitUntil: 'networkidle' });
        });
    }

    public reload() {
        return this.page.reload();
    }

    public exit() {
        this.browser && this.browser.close();
    }

    private async init(idx: number = 0,
                       callbackName: string = 'callPhantom',
                       warmerUrl: string = '',
                       width: number = 800,
                       height: number = 600) {
        let start = (new Date()).valueOf();
        this.browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: true,
            args: ['--ignore-certificate-errors'],
            userDataDir: '/tmp/chrome'
        });
        this.page = await this.browser.newPage();

        this.page.on('console', (...args) => _logger.debug('PAGE LOG:', ...args));
        this.page.on('response', r => _logger.debug(r.status + ' ' + r.url));
        this.page.setViewport({
            width: width,
            height: height
        });

        // Define a window.onCustomEvent function on the page.  
        await this.page.exposeFunction(callbackName, e => {
            _logger.debug('Callback called from browser with', e);
            return this.page.screenshot({
                fullPage: true
            }).then((buffer: Buffer) => {
                this.shotCallback(null, buffer);
                this.isBusy = false;
            }, (err) => {
                this.shotCallback(err, null);
                this.isBusy = false;
            });
        });

        if (warmerUrl) {
            await this.page.goto(warmerUrl, { waitUntil: 'networkidle' });
        }

        _logger.info(`Worker ${idx} ready`);
        this.creationTime = (new Date()).valueOf() - start;
        this.isBusy = false;
    }
}