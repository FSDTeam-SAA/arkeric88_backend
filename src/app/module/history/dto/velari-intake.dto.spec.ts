import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VelariIntakeDto } from './velari-intake.dto';

function dateFromToday(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validIntake(): Record<string, unknown> {
  return {
    recent_feelings: ['stretched_thin'],
    trip_goals: ['reflection'],
    trip_prompt: 'need_a_break',
    preferred_moments: ['quiet_privacy', 'spa_wellness'],
    preferred_environments: ['mountains'],
    trip_pace: 'one_highlight',
    travel_party: 'couple',
    party_adults: 2,
    party_children: 0,
    party_rooms: 1,
    activity_restrictions: ['no_long_drives'],
    restriction_severity: { no_long_drives: 'prefer_avoid' },
    departure_location: 'London',
    travel_distance: 'anywhere',
    travel_timing: 'exact_dates',
    check_in_date: dateFromToday(10),
    check_out_date: dateFromToday(15),
    trip_nights: 5,
    budget_per_night: 400,
    currency: 'USD',
  };
}

async function errorsFor(payload: Record<string, unknown>) {
  return validate(plainToInstance(VelariIntakeDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('VelariIntakeDto', () => {
  it('accepts a valid intake and both supported severity formats', async () => {
    await expect(errorsFor(validIntake())).resolves.toHaveLength(0);

    const flattened = validIntake();
    delete flattened.restriction_severity;
    flattened.restriction_severity_no_long_drives = 'must_avoid';
    await expect(errorsFor(flattened)).resolves.toHaveLength(0);
  });

  it('drops conditional fields when their controlling option is hidden', async () => {
    const instance = plainToInstance(VelariIntakeDto, {
      ...validIntake(),
      recent_feelings_other: 'private text',
      trip_prompt_other: 'more private text',
      travel_period: 'summer',
    });

    expect(instance.recent_feelings_other).toBeUndefined();
    expect(instance.trip_prompt_other).toBeUndefined();
    expect(instance.travel_period).toBeUndefined();
    await expect(
      validate(instance, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    [
      'surprise_me mixed with another environment',
      { preferred_environments: ['surprise_me', 'coast'] },
    ],
    ['missing restriction severity', { restriction_severity: undefined }],
    ['rooms exceeding the party size', { party_rooms: 3 }],
    ['trip nights not matching exact dates', { trip_nights: 4 }],
    ['only one departure coordinate', { departure_latitude: 51.5 }],
  ])('rejects %s', async (_label, override) => {
    const errors = await errorsFor({ ...validIntake(), ...override });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown fields', async () => {
    const errors = await errorsFor({
      ...validIntake(),
      old_question: 'legacy',
    });
    expect(errors.some((error) => error.property === 'old_question')).toBe(
      true,
    );
  });
});
