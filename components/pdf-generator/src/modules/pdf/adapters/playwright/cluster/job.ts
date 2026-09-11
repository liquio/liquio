import { PlaywrightOptions } from '@modules/pdf/adapters/playwright/playwright.types';

export class Job {
  data: JobData;

  callbacks: ExecuteCallbacks;

  constructor(data: JobData, callbacks: ExecuteCallbacks) {
    this.data = data;
    this.callbacks = callbacks;
  }
}

// Types.
export type JobData = {
  html: string;
  options: PlaywrightOptions;
};

export type ExecuteCallbacks = {
  onSuccess: (buffer: Buffer) => void;
  onError: (error: Error) => void;
};
