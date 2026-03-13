/// <reference types="jest-extended" />
import { SolixApi } from '../src/api';

const config = {
  username: process.env.ANKER_USERNAME as string,
  password: process.env.ANKER_PASSWORD as string,
  country: process.env.ANKER_COUNTRY as string,
};
test('should login', async () => {
  const api = new SolixApi({
    username: config.username,
    password: config.password,
    country: config.country,
  });
  const loginResponse = await api.login();
  expect(loginResponse).not.toBeNull();

  console.log('login response:', loginResponse.code, loginResponse.msg);
  const loginData = loginResponse.data ?? null;
  expect(loginData).not.toBeNull();
});
