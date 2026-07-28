import EventEmitter from 'events';

import { InternalServerErrorException } from '@nestjs/common';

import { Job, JobData } from './job';
import { Worker } from './worker';

// Constants.
const DEFAULT_OPTIONS: ClusterOptions = {
  workerTimeout: 30_000,
  maxWorkers: 5,
  maxConcurrentJobs: 200,
};

/**
 * Cluster class for managing a pool of workers.
 */
export class Cluster extends EventEmitter {
  private workers: Worker[] = [];
  private workersBusy: Worker[] = [];
  private workersAvailable: Worker[] = [];

  private isClosing: boolean = false;

  private queue: Job[] = [];
  private activeJobs: number = 0;

  private options: ClusterOptions;

  constructor(clusterOptions?: Partial<ClusterOptions>) {
    super();

    this.options = {
      ...DEFAULT_OPTIONS,
      ...clusterOptions,
    };
  }

  /**
   * Initializes the cluster.
   */
  async init() {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      try {
        const worker = new Worker();
        await worker.launch();

        this.workers.push(worker);
        this.workersAvailable.push(worker);

        this.emit(ClusterEvents.WORKER_CREATED);
      } catch (error) {
        this.emit(ClusterEvents.WORKER_ERROR, error);
      }
    }

    if (this.workers.length === 0) {
      const error = new InternalServerErrorException('Failed to initialize workers');
      this.emit(ClusterEvents.ERROR, error);
      throw error;
    }

    this.emit(ClusterEvents.INITIALIZED, { workersCount: this.workers.length });
  }

  /**
   * Closes the cluster.
   */
  async close() {
    this.isClosing = true;

    try {
      await Promise.all(
        [
          this.workers.map((worker: Worker) => worker.close()),
          this.workersAvailable.map((worker: Worker) => worker.close()),
          this.workersBusy.map((worker: Worker) => worker.close()),
        ].flat(),
      );

      this.emit(ClusterEvents.CLOSE, {
        processedJobs: this.workers.length,
        pendingJobs: this.queue.length,
      });
    } catch (error) {
      this.emit(ClusterEvents.ERROR, error);
      throw error;
    }
  }

  /**
   * Executes a job.
   * @param {JobData} data - Job data.
   */
  execute(data: JobData) {
    return new Promise<Buffer>((resolve, reject) => {
      const job = new Job(data, { onSuccess: resolve, onError: reject });
      this.queue.push(job);
      this.emit(ClusterEvents.EXECUTE, { job });
      void this.doWork();
    });
  }

  /**
   * Takes a job from the queue and processes it.
   */
  private async doWork() {
    if (this.isClosing) {
      return;
    }

    if (this.queue.length === 0) {
      this.emit(ClusterEvents.IDLE);
      return;
    }

    if (!this.canProcessMoreJobs()) {
      return;
    }

    const job = this.queue.shift();
    if (!job) {
      return;
    }

    const worker = this.workersAvailable.shift();
    if (!worker) {
      return;
    }

    this.workersBusy.push(worker);
    this.activeJobs++;

    try {
      const timeout = job.data.options.timeout || this.options.workerTimeout;
      const buffer = await worker.handle(job, timeout);
      job.callbacks.onSuccess(buffer);
      this.emit(ClusterEvents.COMPLETED);
    } catch (error) {
      job.callbacks.onError(error);
      this.emit(ClusterEvents.ERROR, error);
    } finally {
      this.activeJobs--;
    }

    const workerIndex = this.workersBusy.indexOf(worker);
    this.workersBusy.splice(workerIndex, 1);
    this.workersAvailable.push(worker);

    void this.doWork();
  }

  /**
   * Checks if the cluster can process more jobs.
   */
  private canProcessMoreJobs(): boolean {
    const hasAvailableWorkers = this.workersAvailable.length > 0;
    const canHandleJob = this.activeJobs < this.options.maxConcurrentJobs;
    return hasAvailableWorkers && canHandleJob;
  }
}

type ClusterOptions = {
  workerTimeout: number;
  maxWorkers: number;
  maxConcurrentJobs: number;
};

export enum ClusterEvents {
  INITIALIZED = 'init',
  ERROR = 'error',
  CLOSE = 'close',
  WORKER_CREATED = 'worker-created',
  WORKER_ERROR = 'worker-error',
  EXECUTE = 'execute',
  COMPLETED = 'completed',
  IDLE = 'idle',
}
