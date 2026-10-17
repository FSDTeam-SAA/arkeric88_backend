import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('accepts fullName for profile updates', async () => {
    const dto = plainToInstance(UpdateUserDto, { fullName: 'Updated Name' });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toEqual([]);
    expect(dto.fullName).toBe('Updated Name');
  });

  it('does not expose obsolete firstName and lastName fields', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      firstName: 'Updated',
      lastName: 'Name',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((error) => error.property)).toEqual([
      'firstName',
      'lastName',
    ]);
  });
});
