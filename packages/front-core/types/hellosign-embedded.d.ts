declare module 'hellosign-embedded' {
  interface HelloSignOptions {
    clientId?: string;
  }

  interface OpenOptions {
    testMode?: boolean;
  }

  class HelloSign {
    constructor(options?: HelloSignOptions);
    open(url: string, options?: OpenOptions): void;
  }

  export default HelloSign;
}
