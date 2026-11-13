export interface CapturedLine {
  raw: string;
  json?: any;
}

export class LogCapture {
  stdout: CapturedLine[] = [];
  stderr: CapturedLine[] = [];
  private spies: jest.SpyInstance[] = [];

  start(): this {
    const make = (target: CapturedLine[]) => (chunk: unknown) => {
      for (const raw of String(chunk).split('\n')) {
        if (!raw.trim()) continue;
        let json: any;
        try {
          json = JSON.parse(raw);
        } catch {
          json = undefined;
        }
        target.push({ raw, json });
      }
      return true;
    };
    this.spies = [
      jest.spyOn(process.stdout, 'write').mockImplementation(make(this.stdout) as any),
      jest.spyOn(process.stderr, 'write').mockImplementation(make(this.stderr) as any),
    ];
    return this;
  }

  stop(): void {
    this.spies.forEach((s) => s.mockRestore());
    this.spies = [];
  }

  get all(): CapturedLine[] {
    return [...this.stdout, ...this.stderr];
  }

  find(lines: CapturedLine[], type: string) {
    return lines.map((l) => l.json).filter((j) => j && j.type === type);
  }
}
