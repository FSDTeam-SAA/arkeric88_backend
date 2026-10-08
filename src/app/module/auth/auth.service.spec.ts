import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  it('maps the public phone field to the persisted phoneNumber field', async () => {
    const createdUser = { _id: 'user-id', phoneNumber: '01234567890' };
    const userModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(createdUser),
    };
    const service = new AuthService(userModel as never, {} as never);

    const result = await service.register({
      fullName: 'Saurav Sarkar',
      email: 'saurav@example.com',
      password: 'secret123',
      phone: '01234567890',
    });

    expect(userModel.create).toHaveBeenCalledWith({
      fullName: 'Saurav Sarkar',
      email: 'saurav@example.com',
      password: 'secret123',
      phoneNumber: '01234567890',
    });
    expect(result).toBe(createdUser);
  });
});
