import {
  REDACTED_VALUE,
  redactSensitiveFields,
} from './redact-sensitive-fields';

describe('redactSensitiveFields', () => {
  it('redacts private Velari free text at any nesting depth without mutating input', () => {
    const input = {
      intake: {
        recent_feelings_other: 'private feeling',
        nested: [{ trip_prompt_other: 'private reason', safe: 'keep me' }],
      },
    };

    expect(redactSensitiveFields(input)).toEqual({
      intake: {
        recent_feelings_other: REDACTED_VALUE,
        nested: [{ trip_prompt_other: REDACTED_VALUE, safe: 'keep me' }],
      },
    });
    expect(input.intake.recent_feelings_other).toBe('private feeling');
  });
});
