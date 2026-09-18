export class Logger {
  constructor(private readonly scope: string) {}

  info(message: string): void {
    console.log(`[${new Date().toISOString()}] [${this.scope}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${new Date().toISOString()}] [${this.scope}] ${message}`);
  }

  error(message: string, error?: unknown): void {
    const suffix = error instanceof Error ? ` ${error.message}` : error ? ` ${String(error)}` : "";
    console.error(`[${new Date().toISOString()}] [${this.scope}] ${message}${suffix}`);
  }

  child(scope: string): Logger {
    return new Logger(`${this.scope}:${scope}`);
  }
}

export const rootLogger = new Logger("bot");
