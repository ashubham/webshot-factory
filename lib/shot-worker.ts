import * as _ from 'lodash';
import * as puppeteer from 'puppeteer';
import * as Logger from 'log4js';
import * as P from 'bluebird';
import { config } from 'bluebird';

let _logger = Logger.getLogger("shot-worker");
const DEBUG_PORT_OFFSET = 9201;

export interface WorkerConfig {
    callbackName?: string;
    warmerUrl?: string;
    width?: number;
    height?: number;
    timeout?: number;
}

export class ShotWorker {
    public creationTime: number;
    private debugPort: number;
    private browser;
    private page;
    private timeout: number = 60000;
    private shotCallback: (err, buffer: Buffer) => void = _.noop;
    private isBusy: boolean = true;
    public config: WorkerConfig;
    constructor(public id: number) {

    }

    public static async create(idx: number, config: WorkerConfig) {
        let worker = new ShotWorker(idx);
        worker.config = config;
        await worker.init(idx, config.callbackName, config.warmerUrl, config.width, config.height, config.timeout);
        return worker;
    }

    public takeShot(url: string): P<Buffer> {
        if (this.isBusy) {
            _logger.error('Worker is busy doing work');
            return P.reject('Worker is already busy');
        }
        let start = (new Date()).valueOf();
        this.isBusy = true;
        _logger.debug(`screenshot url #${this.id}: ${url}`);
        return new P<Buffer>(async (resolve, reject) => {
            this.shotCallback = async (err, buffer: Buffer) => {
                if (err) {
                    return reject(err);
                }
                resolve(buffer);
            };
            this.page.goto(url, { 
                waitUntil: 'networkidle2' 
            }).then(async () => {
                if(!this.config.callbackName) {
                    let buffer = await this.page.screenshot({
                        fullPage: true
                    });
                    this.shotCallback(null, buffer);
                }
            }).then(null, (err) => {
                this.shotCallback(err, null);
            });
        })
        .timeout(this.timeout)
        .finally(() => {
            _logger.debug(`Worker #${this.id}: Screenshot Complete.`)
            this.isBusy = false
        });
    }

    public reload() {
        return this.page.reload();
    }

    public exit() {
        this.browser && this.browser.close();
    }

    public getStatus() {
        return {
            id: this.id,
            browser: this.browser,
            debugPort: this.debugPort,
            isBusy: this.isBusy
        }
    }

    private async init(idx: number = 0,
                       callbackName: string = '',
                       warmerUrl: string = '',
                       width: number = 800,
                       height: number = 600,
                       timeout: number = 60000) {
        let start = (new Date()).valueOf();
        this.debugPort = DEBUG_PORT_OFFSET + idx; 
        this.timeout = timeout;
        this.browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: true,
            args: [
                '--ignore-certificate-errors',
                '--enable-precise-memory-info',
                `--remote-debugging-port=${this.debugPort}`],
            userDataDir: '/tmp/chrome'
        });
        this.page = await this.browser.newPage();

        this.page.on('console', (...args) => _logger.debug(`PAGE LOG Worker #${idx}:`, ...args));
        this.page.on('response', r => _logger.debug(`Worker #${idx}: ${r.status} ${r.url}`));
        this.page.setViewport({
            width: width,
            height: height
        });

        // Define a window.onCustomEvent function on the page.  
        if(callbackName) {
            await this.page.exposeFunction(callbackName, e => {
                _logger.debug('Callback called from browser with', e);
                return this.page.screenshot({
                    fullPage: true
                }).then((buffer: Buffer) => {
                    this.shotCallback(null, buffer);
                }, (err) => {
                    this.shotCallback(err, null);
                });
            });
        }

        if (warmerUrl) {
            await this.page.goto(warmerUrl, { waitUntil: 'networkidle2' });
        }

        _logger.info(`Worker ${idx} ready`);
        this.creationTime = (new Date()).valueOf() - start;
        this.isBusy = false;
    }
}