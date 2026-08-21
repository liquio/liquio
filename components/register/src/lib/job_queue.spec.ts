import JobQueue from './job_queue';

async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('JobQueue', function () {
  it('should be instantiated', async () => {
    const jobQueue = new JobQueue();
    expect(jobQueue).toBeDefined();
  });

  it('should process add job', async () => {
    const jobQueue = new JobQueue();

    let isJobRunning = false;

    const job = async () => {
      isJobRunning = true;
      await wait(500);
      isJobRunning = false;
    };
    jobQueue.addJob(job);

    expect(isJobRunning).toBe(true);

    await jobQueue.wait();

    expect(isJobRunning).toBe(false);
  });

  it('should execute job callbacks', async () => {
    let jobSuccess;
    let jobFailure;
    let runFinished;

    const jobQueue = new JobQueue({
      onJobSuccess: async (result) => {
        jobSuccess = result;
      },
      onJobFailure: async (error) => {
        jobFailure = error;
      },
      onRunFinished: async () => {
        runFinished = true;
      }
    });

    const job = async () => {
      return 1;
    };
    jobQueue.addJob(job);
    await jobQueue.wait();

    expect(jobSuccess).toBe(1);
    expect(jobFailure).toBeUndefined();
    expect(runFinished).toBe(true);
  });

  it('should intercept job exceptions', async () => {
    let jobSuccess;
    let jobFailure;
    let runFinished;

    const jobQueue = new JobQueue({
      onJobSuccess: async (result) => {
        jobSuccess = result;
      },
      onJobFailure: async (error) => {
        jobFailure = error;
      },
      onRunFinished: async () => {
        runFinished = true;
      }
    });

    const job = async () => {
      throw new Error('job error');
    };
    jobQueue.addJob(job);
    await jobQueue.wait();

    expect(jobSuccess).toBeUndefined();
    expect(jobFailure).toBeDefined();
    expect(jobFailure.message).toBe('job error');
    expect(runFinished).toBe(true);
  });
});
