import { consoleLogger } from '../../src/logger';

describe('consoleLogger', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('consoleLogger(false) — non-verbose', () => {
    it('suppresses log()', () => {
      const logger = consoleLogger(false);
      logger.log('hello');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('suppresses warn()', () => {
      const logger = consoleLogger(false);
      logger.warn('caution');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('always calls error() even in non-verbose mode', () => {
      const logger = consoleLogger(false);
      logger.error('boom');
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('prefixes error() with an ISO timestamp', () => {
      const logger = consoleLogger(false);
      logger.error('oops');
      const firstArg = errorSpy.mock.calls[0][0] as string;
      expect(firstArg).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('consoleLogger(true) — verbose', () => {
    it('calls log() and prefixes with ISO timestamp', () => {
      const logger = consoleLogger(true);
      logger.log('hi');
      expect(logSpy).toHaveBeenCalledTimes(1);
      const firstArg = logSpy.mock.calls[0][0] as string;
      expect(firstArg).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('calls warn() and prefixes with ISO timestamp', () => {
      const logger = consoleLogger(true);
      logger.warn('watch out');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const firstArg = warnSpy.mock.calls[0][0] as string;
      expect(firstArg).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('calls error() and prefixes with ISO timestamp', () => {
      const logger = consoleLogger(true);
      logger.error('fail');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const firstArg = errorSpy.mock.calls[0][0] as string;
      expect(firstArg).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('forwards additional arguments after the timestamp prefix', () => {
      const logger = consoleLogger(true);
      logger.log('msg', 42);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[/),
        'msg',
        42,
      );
    });
  });
});
