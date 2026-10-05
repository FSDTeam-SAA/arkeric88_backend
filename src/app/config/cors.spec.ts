import { getCorsSettings } from './cors';

describe('getCorsSettings', () => {
  it('allows all origins without credentials when no origins are configured', () => {
    expect(getCorsSettings('')).toEqual({ origin: '*', credentials: false });
  });

  it('enables credentials only for explicitly configured origins', () => {
    expect(
      getCorsSettings('https://app.velari.test, https://admin.velari.test'),
    ).toEqual({
      origin: ['https://app.velari.test', 'https://admin.velari.test'],
      credentials: true,
    });
  });
});
