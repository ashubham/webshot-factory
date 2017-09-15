import { EventEmitter } from 'eventemitter3';
export interface Job {
    url: string;
    done: (err, buffer: Buffer) => void;
}

export class JobQueue extends EventEmitter {
    private jobs: Job[] = [];
    constructor() {
        super();
    }

    get length() {
        return this.jobs.length;
    }

    public enqueue(job: Job) {
        this.jobs.push(job);
        this.emit('process');
    }

    public dequeue() {
        return this.jobs.shift();
    }

    public hasJobs() {
        return this.jobs.length > 0;
    }
}