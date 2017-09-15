import { Job, JobQueue } from './job-queue';
import { ShotWorker } from './shot-worker';
import * as _ from 'lodash';


let idleWorkers: ShotWorker[] = [];
let jobQueue: JobQueue = new JobQueue();
let _callbackName: string;
let _warmerUrl: string;
let _concurrency: number = 0;
export async function create(concurrency: number,
                       callbackName: string = 'callPhantom',
                       warmerUrl: string) {
    _callbackName = callbackName;
    _warmerUrl = warmerUrl;
    _concurrency = concurrency;
    return addWorkers(concurrency);
}

async function addWorkers(numWorkers: number) {
    let newWorkers = await Promise.all(_.range(numWorkers).map((idx) => {
        return ShotWorker.create(_concurrency + idx, _callbackName, _warmerUrl);
    }));
    idleWorkers.push(...newWorkers);
    _concurrency += numWorkers;
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

let process = async () => {
    if (idleWorkers.length && jobQueue.hasJobs()) {
        let worker: ShotWorker = idleWorkers.pop();
        let job = jobQueue.dequeue();
        try {
            let buffer = await worker.takeShot(job.url);
            job.done(null, buffer);
        } catch (err) {
            job.done(err, null);
        } finally {
            idleWorkers.unshift(worker);
            process();
        }
    }
};

jobQueue.on('process', process);
