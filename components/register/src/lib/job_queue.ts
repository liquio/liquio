export type Job = () => Promise<any>;

export interface JobQueueOptions {
  onJobSuccess?: (result: any) => Promise<void>;
  onJobFailure?: (error: any) => Promise<void>;
  onRunFinished?: () => Promise<void>;
}

export default class JobQueue {
  jobs: Job[];
  isRunning: boolean;
  onJobSuccess: any;
  onJobFailure: any;
  onRunFinished: any;
  runPromise?: any;

  constructor(callbacks?: JobQueueOptions) {
    this.jobs = [];
    this.isRunning = false;
    this.onJobSuccess = callbacks?.onJobSuccess ? callbacks.onJobSuccess : async () => {};
    this.onJobFailure = callbacks?.onJobFailure ? callbacks.onJobFailure : async () => {};
    this.onRunFinished = callbacks?.onRunFinished ? callbacks.onRunFinished : async () => {};
    this.runPromise = undefined;
  }

  addJob(job: Job) {
    this.jobs.push(job);
    if (!this.isRunning) {
      this.runPromise = this.run();
    }
  }

  async run() {
    this.isRunning = true;
    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      try {
        const result = await job();
        await this.onJobSuccess(result);
      } catch (error) {
        await this.onJobFailure(error);
      }
    }
    await this.onRunFinished();
    this.isRunning = false;
  }

  async wait() {
    await this.runPromise;
  }
}
