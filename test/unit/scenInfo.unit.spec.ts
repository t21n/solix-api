jest.mock('node-fetch');
import fetch, { Response } from 'node-fetch';
import { LoginResultResponse, ScenInfo, SolixApi } from '../../src/api';
import offlineFixture from '../fixtures/scene_info_offline.json';
import onlineNoPvFixture from '../fixtures/scene_info_online_no_pv.json';

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

function mockResponse(body: unknown): Response {
  return {
    status: 200,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

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

function makeLoggedIn() {
  const api = new SolixApi({
    username: 'test@example.com',
    password: 'secret',
    country: 'DE',
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  return api.withLogin(FAKE_LOGIN);
}

describe('scenInfo() — offline (system issue)', () => {
  let result: { data?: ScenInfo };

  beforeEach(async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(mockResponse(offlineFixture));
    result = await makeLoggedIn().scenInfo('site1');
  });

  it('returns is_display_data = false', () => {
    expect(result.data?.solarbank_info.is_display_data).toBe(false);
  });

  it('reports device status "0" (offline)', () => {
    expect(result.data?.solarbank_info.solarbank_list[0].status).toBe('0');
  });

  it('has zero photovoltaic power', () => {
    expect(result.data?.solarbank_info.total_photovoltaic_power).toBe('0');
  });

  it('has zero battery power', () => {
    expect(result.data?.solarbank_info.total_battery_power).toBe('0.00');
  });

  it('has epoch updated_time indicating no live data', () => {
    expect(result.data?.solarbank_info.updated_time).toBe('1970-01-01 00:00:00');
  });

  it('has device is_display = false', () => {
    expect(result.data?.solarbank_info.solarbank_list[0].is_display).toBe(false);
  });
});

describe('scenInfo() — online, no PV power (night / no sun)', () => {
  let result: { data?: ScenInfo };

  beforeEach(async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(mockResponse(onlineNoPvFixture));
    result = await makeLoggedIn().scenInfo('site1');
  });

  it('returns is_display_data = true', () => {
    expect(result.data?.solarbank_info.is_display_data).toBe(true);
  });

  it('reports device status "1" (online)', () => {
    expect(result.data?.solarbank_info.solarbank_list[0].status).toBe('1');
  });

  it('has zero photovoltaic power despite being online', () => {
    expect(result.data?.solarbank_info.total_photovoltaic_power).toBe('0');
  });

  it('has non-zero battery power remaining', () => {
    expect(parseFloat(result.data?.solarbank_info.total_battery_power ?? '0')).toBeGreaterThan(0);
  });

  it('has a real updated_time timestamp', () => {
    expect(result.data?.solarbank_info.updated_time).not.toBe('1970-01-01 00:00:00');
    expect(result.data?.solarbank_info.updated_time).not.toBe('01-01-0001 00:00:00');
  });

  it('has device is_display = true', () => {
    expect(result.data?.solarbank_info.solarbank_list[0].is_display).toBe(true);
  });

  it('has device charging_status "7" (battery-only discharge, no solar)', () => {
    expect(result.data?.solarbank_info.solarbank_list[0].charging_status).toBe('7');
  });
});
