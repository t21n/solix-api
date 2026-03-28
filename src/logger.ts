export type Logger = Pick<typeof console, 'log' | 'warn' | 'error'>;

export function consoleLogger(verbose: boolean): Logger {
  return {
    log(...params: Parameters<typeof console.log>) {
      if (verbose) {
        // eslint-disable-next-line no-console
        console.log(`[${new Date().toISOString()}]`, ...params);
      }
    },
    warn(...params: Parameters<typeof console.warn>) {
      if (verbose) {
        // eslint-disable-next-line no-console
        console.warn(`[${new Date().toISOString()}]`, ...params);
      }
    },
    error(...params: Parameters<typeof console.error>) {
      // eslint-disable-next-line no-console
      console.error(`[${new Date().toISOString()}]`, ...params);
    },
  };
}
