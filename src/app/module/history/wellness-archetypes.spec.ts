import { BadRequestException } from '@nestjs/common';
import { normalizeQuestionnaireAnswers } from './wellness-archetypes';

describe('normalizeQuestionnaireAnswers', () => {
  const commonAnswers = {
    energy_level: 'Low',
    travel_style: 'Solo (Just me and my thoughts)',
    trip_organization: 'Loosely planned',
    activity_restrictions: ['No limitations'],
    preferred_environments: ['Nature'],
    birthdate: '1990-05-20',
    total_trip_budget: 3000,
    trip_length_days: 7,
  };

  it('adds the canonical archetype profile while preserving travel answers', () => {
    const result = normalizeQuestionnaireAnswers({
      selected_archetype: 'seeker',
      archetype_answers: {
        seeker_intention: 'My purpose',
        seeker_practice: 'Meditation and silence',
        seeker_nature: 'Deep immersion every day',
        seeker_guidance: 'Mostly solitary exploration',
      },
      ...commonAnswers,
    });

    expect(result).toMatchObject({
      archetype_id: 'seeker',
      selected_archetype: 'Seeker',
      todays_feeling: 'Reflective',
      experience_kind: 'Spiritual',
      life_season: 'Reflecting',
      energy_level: 'Low',
      trip_length_days: 7,
      archetype_profile: {
        core_traits: ['Introspective', 'Spiritually curious', 'Meaning-seeking'],
        needs: ['Mindfulness', 'Nature immersion', 'Emotional grounding'],
        avoid: ['Clinical environments', 'Data-heavy language'],
      },
    });
  });

  it.each([
    [
      'burned_out_achiever',
      'Burned-Out Achiever',
      {
        burnout_recovery_priority: 'Restorative sleep',
        burnout_current_pressure: 'I am always switched on',
        burnout_support_style: 'Private and self-paced',
        burnout_social_boundary: 'As little as possible',
      },
    ],
    [
      'transformer',
      'Transformer',
      {
        transformation_focus: 'Physical vitality',
        transformation_challenge: 'Gentle momentum',
        transformation_structure: 'A clear daily schedule',
        transformation_movement: 'Daily functional movement',
      },
    ],
    [
      'seeker',
      'Seeker',
      {
        seeker_intention: 'My purpose',
        seeker_practice: 'Meditation and silence',
        seeker_nature: 'Deep immersion every day',
        seeker_guidance: 'Mostly solitary exploration',
      },
    ],
    [
      'optimizer',
      'Optimizer',
      {
        optimizer_outcome: 'Longevity and prevention',
        optimizer_diagnostics: 'A focused health assessment',
        optimizer_tracking: 'Clear before-and-after metrics',
        optimizer_program: 'Highly structured and clinical',
      },
    ],
    [
      'escapist',
      'Escapist',
      {
        escape_from: 'Noise and stimulation',
        escape_sensation: 'A breathtaking view',
        escape_freedom: 'Almost none',
        escape_reset: 'Digital disconnection',
      },
    ],
    [
      'reconnector',
      'Reconnector',
      {
        reconnection_focus: 'My partner',
        reconnection_experience: 'Unhurried conversations',
        reconnection_tone: 'Warm and nurturing',
        reconnection_balance: 'Almost everything together',
      },
    ],
  ])('accepts the %s question branch', (id, name, archetypeAnswers) => {
    const result = normalizeQuestionnaireAnswers({
      selected_archetype: id,
      archetype_answers: archetypeAnswers,
      ...commonAnswers,
    });

    expect(result.selected_archetype).toBe(name);
    expect(result.archetype_answers).toEqual(archetypeAnswers);
  });

  it('rejects answers from a different archetype branch', () => {
    expect(() =>
      normalizeQuestionnaireAnswers({
        selected_archetype: 'seeker',
        ...commonAnswers,
        archetype_answers: {
          transformation_focus: 'Physical vitality',
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('keeps legacy questionnaires processable', () => {
    expect(normalizeQuestionnaireAnswers({ todays_feeling: 'Calm' })).toEqual({
      todays_feeling: 'Calm',
    });
  });
});
