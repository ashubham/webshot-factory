import { Job, JobQueue } from './job-queue';
import { ShotWorker, WorkerConfig } from './shot-worker';
import * as _ from 'lodash';
import * as Logger from 'log4js';
import * as ON_DEATH from 'death';

let _logger = Logger.getLogger("shot-pool");

export interface PoolConfig extends WorkerConfig {
    concurrency?: number;
}

let idleWorkers: ShotWorker[] = [];
let allWorkers: ShotWorker[] = [];
let jobQueue: JobQueue = new JobQueue();
let opts: PoolConfig;
let concurrency = 0;
export async function create(options: PoolConfig) {
    opts = options;
    return addWorkers(options.concurrency);
}

async function addWorkers(numWorkers: number) {
    try {
        let newWorkers = await Promise.all(_.range(numWorkers).map((idx) => {
            return ShotWorker.create(concurrency + idx , opts);
        }));

        idleWorkers.push(...newWorkers);
        allWorkers.push(...newWorkers);
        concurrency += numWorkers;
    } catch (e) {
        _logger.error("error while adding worker to the queue", e);
	throw e;
    }
    
}

export function getShot(url): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        jobQueue.enqueue({
            url: url,
            done: (err, buffer) => {
                if (err) {
                    return reject(err);
                }
                return resolve(buffer);
            }
        });
    });
}

export function getStatus() {
    return {
        jobQueue,
        allWorkers,
        idleWorkers
    }
}

let processJob = async () => {
    if (idleWorkers.length && jobQueue.hasJobs()) {
        let worker: ShotWorker = idleWorkers.pop();
        let job = jobQueue.dequeue();
        try {
            let buffer = await worker.takeShot(job.url);
            job.done(null, buffer);
        } catch (err) {
            _logger.error("error while taking screenshot", err);
            job.done(err, null);
        } finally {
            idleWorkers.unshift(worker);
            processJob();
        }
    }
};

jobQueue.on('process', processJob);

ON_DEATH(async () => {
    _logger.info('Exiting ...', allWorkers.length);
    await Promise.all(allWorkers.map((worker: ShotWorker) => {
        console.log(`Exiting Worker ${worker.id}`);
        return worker.exit();
    }));
    process.exit();
});
