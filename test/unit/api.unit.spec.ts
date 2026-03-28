import fetch, { Response } from 'node-fetch';
import { createHash } from 'crypto';
import { LoadConfiguration, LoginResultResponse, ParamType, SolixApi } from '../../src/api';

jest.mock('node-fetch');

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

function mockResponse(status: number, body: unknown): Response {
  return {
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

const BASE = { code: 0, msg: 'success!', trace_id: 'trace1' };

const FAKE_LOGIN: LoginResultResponse = {
  user_id: 'user123',
  email: 'test@example.com',
  nick_name: 'Tester',
  auth_token: 'tok-abc',
  token_expires_at: 9999999999,
  avatar: '',
  mac_addr: '',
  domain: '',
  ab_code: 'DE',
  geo_key: '',
  privilege: 0,
  phone: '',
  phone_code: '',
  server_secret_info: null,
  params: null,
  trust_list: null,
  token_id: 1,
  fa_info: { step: 0, info: '' },
  country_code: 'DE',
};

function makeApi(country = 'de') {
  return new SolixApi({
    username: 'test@example.com',
    password: 'secret',
    country,
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
}

describe('SolixApi constructor', () => {
  it('uppercases the country option', () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { ...BASE, data: FAKE_LOGIN }),
    );
    const api = makeApi('de');
    return api.login().then(() => {
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers.Country).toBe('DE');
    });
  });
});

describe('SolixApi.login()', () => {
  beforeEach(() => mockFetch.mockReset());

  it('POSTs to the EU passport/login endpoint', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { ...BASE, data: FAKE_LOGIN }),
    );
    await makeApi().login();
    const url: string = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe('https://ankerpower-api-eu.anker.com/passport/login');
    expect(mockFetch.mock.calls[0][1]?.method).toBe('POST');
  });

  it('returns parsed JSON on HTTP 200', async () => {
    const responseBody = { ...BASE, data: FAKE_LOGIN };
    mockFetch.mockResolvedValueOnce(mockResponse(200, responseBody));
    const result = await makeApi().login();
    expect(result).toEqual(responseBody);
  });

  it('throws an error on non-200 status', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401, { error: 'Unauthorized' }));
    await expect(makeApi().login()).rejects.toThrow('Login failed (401)');
  });

  it('includes the error status code in the thrown message', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(403, 'Forbidden'));
    await expect(makeApi().login()).rejects.toThrow('403');
  });

  it('sends an encrypted (non-empty) password field in the request body', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { ...BASE, data: FAKE_LOGIN }),
    );
    await makeApi().login();
    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as Record<string, unknown>;
    expect(body.password).toBeTruthy();
    expect(body.password).not.toBe('secret');
  });
});

describe('SolixApi.withLogin() — authenticated methods', () => {
  let api: SolixApi;
  let loggedIn: ReturnType<SolixApi['withLogin']>;

  beforeEach(() => {
    mockFetch.mockReset();
    api = makeApi();
    loggedIn = api.withLogin(FAKE_LOGIN);
  });

  it('attaches X-Auth-Token header from login result', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { ...BASE, data: { site_list: [] } }),
    );
    await loggedIn.getSiteList();
    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-Auth-Token']).toBe(FAKE_LOGIN.auth_token);
  });

  it('sets gtoken header as MD5 of user_id', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { ...BASE, data: { site_list: [] } }),
    );
    await loggedIn.getSiteList();
    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    const expectedGtoken = createHash('md5')
      .update(Buffer.from(FAKE_LOGIN.user_id))
      .digest('hex');
    expect(headers.gtoken).toBe(expectedGtoken);
  });

  describe('getSiteDeviceParam with ParamType.LoadConfiguration', () => {
    it('parses JSON param_data from the response', async () => {
      const loadConfig: LoadConfiguration = {
        ranges: [],
        min_load: 100,
        max_load: 800,
        step: 100,
      };
      mockFetch.mockResolvedValueOnce(
        mockResponse(200, {
          ...BASE,
          data: { param_data: JSON.stringify(loadConfig) },
        }),
      );
      const result = await loggedIn.getSiteDeviceParam({
        paramType: ParamType.LoadConfiguration,
        siteId: 'site1',
      });
      expect(result.data?.param_data).toEqual(loadConfig);
    });

    it('returns param_data as a parsed object, not a string', async () => {
      const loadConfig: LoadConfiguration = {
        ranges: [],
        min_load: 50,
        max_load: 600,
        step: 50,
      };
      mockFetch.mockResolvedValueOnce(
        mockResponse(200, {
          ...BASE,
          data: { param_data: JSON.stringify(loadConfig) },
        }),
      );
      const result = await loggedIn.getSiteDeviceParam({
        paramType: ParamType.LoadConfiguration,
        siteId: 'site1',
      });
      expect(typeof result.data?.param_data).toBe('object');
    });
  });

  describe('setSiteDeviceParam with ParamType.LoadConfiguration', () => {
    it('stringifies param_data before sending', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(200, { ...BASE, data: {} }),
      );
      const loadConfig: LoadConfiguration = {
        ranges: [],
        min_load: 100,
        max_load: 800,
        step: 100,
      };
      await loggedIn.setSiteDeviceParam({
        paramType: ParamType.LoadConfiguration,
        siteId: 'site1',
        paramData: loadConfig,
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as Record<string, unknown>;
      expect(typeof body.param_data).toBe('string');
      expect(JSON.parse(body.param_data as string)).toEqual(loadConfig);
    });
  });

  describe('energyAnalysis — date formatting', () => {
    it('uses getUTCMonth() (0-indexed) for month in start_time', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(200, { ...BASE, data: {} }),
      );
      // January is month index 0; getUTCMonth() returns 0 → padded to "00"
      const startTime = new Date('2024-01-15T00:00:00Z');
      await loggedIn.energyAnalysis({
        siteId: 'site1',
        deviceSn: 'dev1',
        type: 'day',
        startTime,
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as Record<string, unknown>;
      // getUTCMonth() of Jan = 0, padded = "00"
      expect(body.start_time).toBe('2024-00-15');
    });

    it('uses getUTCMonth() for month — non-January date', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(200, { ...BASE, data: {} }),
      );
      // March is month index 2; getUTCMonth() returns 2 → padded to "02"
      const startTime = new Date('2024-03-05T00:00:00Z');
      await loggedIn.energyAnalysis({
        siteId: 'site1',
        deviceSn: 'dev1',
        type: 'day',
        startTime,
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as Record<string, unknown>;
      expect(body.start_time).toBe('2024-02-05');
    });
  });
});
