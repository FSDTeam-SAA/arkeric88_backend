import { BadRequestException } from '@nestjs/common';

type ArchetypeDefinition = {
  id: string;
  name: string;
  coreTraits: string[];
  needs: string[];
  avoid: string[];
  sampleRetreats: string[];
  legacyProfile: {
    todaysFeeling: string;
    experienceKind: string;
    lifeSeason: string;
  };
  questions: Record<string, string[]>;
};

const archetypes: ArchetypeDefinition[] = [
  {
    id: 'burned_out_achiever',
    name: 'Burned-Out Achiever',
    coreTraits: ['High-performing', 'Mentally exhausted', 'Overstimulated'],
    needs: ['Nervous system regulation', 'Quiet luxury', 'Restorative sleep'],
    avoid: ['Aggressive programming', 'Forced socialization'],
    sampleRetreats: ['Sensei Lanai', 'COMO Shambhala', 'Kamalaya'],
    legacyProfile: {
      todaysFeeling: 'Overwhelmed',
      experienceKind: 'Deep Rest',
      lifeSeason: 'Healing',
    },
    questions: {
      burnout_recovery_priority: [
        'Restorative sleep',
        'My nervous system',
        'Mental clarity',
        'Physical energy',
      ],
      burnout_current_pressure: [
        'I am always switched on',
        'I feel mentally overloaded',
        'My sleep is suffering',
        'I have very little time for myself',
      ],
      burnout_support_style: [
        'Private and self-paced',
        'Gentle expert guidance',
        'A clear but spacious program',
        'Mostly rest with optional activities',
      ],
      burnout_social_boundary: [
        'As little as possible',
        'A few meaningful interactions',
        'Small calm groups',
        'I am open to connecting when it feels natural',
      ],
    },
  },
  {
    id: 'transformer',
    name: 'Transformer',
    coreTraits: ['Growth-oriented', 'Challenge-seeking', 'Open to discomfort'],
    needs: ['Structure', 'Accountability', 'Physical engagement'],
    avoid: ['Unstructured retreats', 'Passive retreats'],
    sampleRetreats: ['The Ranch Malibu', 'Lanserhof', 'SHA Wellness'],
    legacyProfile: {
      todaysFeeling: 'Inspired',
      experienceKind: 'Transformation',
      lifeSeason: 'Reinventing',
    },
    questions: {
      transformation_focus: [
        'Physical vitality',
        'Habits and discipline',
        'Confidence and resilience',
        'A major life transition',
      ],
      transformation_challenge: [
        'Gentle momentum',
        'A meaningful stretch',
        'A demanding reset',
        'Push me beyond my comfort zone',
      ],
      transformation_structure: [
        'A clear daily schedule',
        'Expert coaching',
        'Measurable milestones',
        'Shared accountability',
      ],
      transformation_movement: [
        'Daily functional movement',
        'Strength and conditioning',
        'Hiking and outdoor challenge',
        'A varied physical program',
      ],
    },
  },
  {
    id: 'seeker',
    name: 'Seeker',
    coreTraits: ['Introspective', 'Spiritually curious', 'Meaning-seeking'],
    needs: ['Mindfulness', 'Nature immersion', 'Emotional grounding'],
    avoid: ['Clinical environments', 'Data-heavy language'],
    sampleRetreats: ['Ananda', 'Fivelements', 'Blue Spirit Costa Rica'],
    legacyProfile: {
      todaysFeeling: 'Reflective',
      experienceKind: 'Spiritual',
      lifeSeason: 'Reflecting',
    },
    questions: {
      seeker_intention: ['My purpose', 'My emotions', 'A life decision', 'My spiritual path'],
      seeker_practice: [
        'Meditation and silence',
        'Yoga and breathwork',
        'Ritual and spiritual guidance',
        'Journaling and reflection',
      ],
      seeker_nature: [
        'Deep immersion every day',
        'A peaceful setting for reflection',
        'Guided nature experiences',
        'A balance of nature and comfort',
      ],
      seeker_guidance: [
        'Mostly solitary exploration',
        'Occasional one-to-one guidance',
        'A guided daily practice',
        'A supportive like-minded group',
      ],
    },
  },
  {
    id: 'optimizer',
    name: 'Optimizer',
    coreTraits: ['Performance-oriented', 'Data-driven', 'Biohacking-curious'],
    needs: ['Diagnostics', 'Measurable outcomes', 'Longevity focus'],
    avoid: ['Vague wellness offerings', 'Unstructured wellness offerings'],
    sampleRetreats: ['Clinique La Prairie', 'Velaa', 'RAKxa'],
    legacyProfile: {
      todaysFeeling: 'Focused',
      experienceKind: 'Longevity',
      lifeSeason: 'Building',
    },
    questions: {
      optimizer_outcome: [
        'Longevity and prevention',
        'Energy and performance',
        'Sleep and recovery',
        'Metabolic health',
      ],
      optimizer_diagnostics: [
        'A focused health assessment',
        'Comprehensive testing',
        'Continuous measurement',
        'Only tests that change the plan',
      ],
      optimizer_tracking: [
        'Clear before-and-after metrics',
        'Daily data and feedback',
        'Expert interpretation',
        'A practical long-term plan',
      ],
      optimizer_program: [
        'Highly structured and clinical',
        'Evidence-led with luxury',
        'Intensive but time-efficient',
        'Personalized with room to recharge',
      ],
    },
  },
  {
    id: 'escapist',
    name: 'Escapist',
    coreTraits: ['Emotionally drained', 'Craving beauty', 'Craving simplicity'],
    needs: ['Sensory reset', 'Freedom', 'Stunning environments'],
    avoid: ['Heavy structure', 'Intensity', 'Group pressure'],
    sampleRetreats: ['Soneva Soul', 'Amangiri', 'Post Ranch Inn'],
    legacyProfile: {
      todaysFeeling: 'Emotionally drained',
      experienceKind: 'Escape',
      lifeSeason: 'Healing',
    },
    questions: {
      escape_from: [
        'Noise and stimulation',
        'Responsibility and decisions',
        'Routine and repetition',
        'Emotional heaviness',
      ],
      escape_sensation: [
        'A breathtaking view',
        'Silence and privacy',
        'Warmth, water, and sunshine',
        'Beautiful design and effortless service',
      ],
      escape_freedom: [
        'Almost none',
        'A few optional rituals',
        'One anchor activity each day',
        'A gentle plan I can change anytime',
      ],
      escape_reset: [
        'Digital disconnection',
        'Sensory indulgence',
        'Creative inspiration',
        'Doing absolutely nothing',
      ],
    },
  },
  {
    id: 'reconnector',
    name: 'Reconnector',
    coreTraits: ['Relationship-oriented', 'Seeking shared experiences'],
    needs: ['Intimacy', 'Emotional warmth', 'Softer structure'],
    avoid: ['Solo-only experiences', 'Cold clinical settings'],
    sampleRetreats: ['BodyHoliday', 'Miraval Arizona', 'Zulal'],
    legacyProfile: {
      todaysFeeling: 'Disconnected',
      experienceKind: 'Connection',
      lifeSeason: 'Reconnecting',
    },
    questions: {
      reconnection_focus: [
        'My partner',
        'Family or close friends',
        'Myself before reconnecting with others',
        'A sense of community',
      ],
      reconnection_experience: [
        'Unhurried conversations',
        'Wellness rituals together',
        'Play and adventure',
        'Learning something new together',
      ],
      reconnection_tone: [
        'Warm and nurturing',
        'Joyful and celebratory',
        'Quiet and intimate',
        'Healing and restorative',
      ],
      reconnection_balance: [
        'Almost everything together',
        'Shared highlights with personal downtime',
        'A balanced mix',
        'Plenty of individual space',
      ],
    },
  },
];

function normalizeLookupValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '_')
    .replaceAll(/^_|_$/g, '');
}

function getArchetype(value: unknown): ArchetypeDefinition | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeLookupValue(value);
  return archetypes.find(
    (archetype) =>
      archetype.id === normalized || normalizeLookupValue(archetype.name) === normalized,
  );
}

function validateArchetypeAnswers(
  archetype: ArchetypeDefinition,
  value: unknown,
): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Archetype-specific answers are required');
  }

  const submitted = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(archetype.questions).map(([key, allowedAnswers]) => {
      const answer = submitted[key];
      if (typeof answer !== 'string' || !allowedAnswers.includes(answer.trim())) {
        throw new BadRequestException(`Invalid or missing answer for ${key}`);
      }
      return [key, answer.trim()];
    }),
  );
}

function requireAllowedString(
  answers: Record<string, unknown>,
  key: string,
  allowedAnswers: string[],
): string {
  const answer = answers[key];
  if (typeof answer !== 'string' || !allowedAnswers.includes(answer.trim())) {
    throw new BadRequestException(`Invalid or missing answer for ${key}`);
  }
  return answer.trim();
}

function requireAllowedStringArray(
  answers: Record<string, unknown>,
  key: string,
  allowedAnswers: string[],
): string[] {
  const answer = answers[key];
  if (
    !Array.isArray(answer) ||
    answer.length === 0 ||
    answer.some((item) => typeof item !== 'string' || !allowedAnswers.includes(item.trim()))
  ) {
    throw new BadRequestException(`Invalid or missing answer for ${key}`);
  }
  return [...new Set(answer.map((item: string) => item.trim()))];
}

function validateCommonAnswers(answers: Record<string, unknown>): Record<string, unknown> {
  const birthdate = typeof answers.birthdate === 'string' ? answers.birthdate.trim() : '';
  const parsedBirthdate = new Date(`${birthdate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(birthdate) ||
    Number.isNaN(parsedBirthdate.getTime()) ||
    !parsedBirthdate.toISOString().startsWith(birthdate) ||
    parsedBirthdate >= new Date()
  ) {
    throw new BadRequestException('Invalid or missing answer for birthdate');
  }

  const budget = Number(answers.total_trip_budget);
  const tripLengthDays = Number(answers.trip_length_days);
  if (!Number.isFinite(budget) || budget < 100 || budget > 7000) {
    throw new BadRequestException('Trip budget must be between 100 and 7000');
  }
  if (![3, 7, 14, 21].includes(tripLengthDays)) {
    throw new BadRequestException('Invalid or missing answer for trip_length_days');
  }

  return {
    energy_level: requireAllowedString(answers, 'energy_level', ['Low', 'Medium', 'High']),
    travel_style: requireAllowedString(answers, 'travel_style', [
      'Solo (Just me and my thoughts)',
      'Couple (An intimate shared experience)',
      'Small Group (2–6 close companions)',
      'Family (Travel with loved ones)',
    ]),
    trip_organization: requireAllowedString(answers, 'trip_organization', [
      'Loosely planned',
      'Well Planned',
      'Hour by hour',
    ]),
    activity_restrictions: requireAllowedStringArray(answers, 'activity_restrictions', [
      'Intense hiking or climbing',
      'Extreme heat or cold',
      'High-impact physical activity',
      'Water activities',
      'Long drives or transport',
      'No limitations',
    ]),
    preferred_environments: requireAllowedStringArray(answers, 'preferred_environments', [
      'Mountains',
      'Nature',
      'Ocean',
      'Beach',
      'City',
      'Culture',
      'Countryside',
      'Farmland',
      'Desert',
      'Snow',
      'Warm Weather',
      'Cold Weather',
    ]),
    birthdate,
    total_trip_budget: budget,
    trip_length_days: tripLengthDays,
  };
}

export function normalizeQuestionnaireAnswers(
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const selection = answers.selected_archetype ?? answers.archetype_id;

  // Historical payments created before the archetype quiz remain processable.
  if (selection === undefined || selection === null || selection === '') {
    return { ...answers };
  }

  const archetype = getArchetype(selection);
  if (!archetype) {
    throw new BadRequestException('Unknown wellness traveler archetype');
  }

  const archetypeAnswers = validateArchetypeAnswers(archetype, answers.archetype_answers);
  const commonAnswers = validateCommonAnswers(answers);

  return {
    ...answers,
    ...commonAnswers,
    archetype_id: archetype.id,
    selected_archetype: archetype.name,
    archetype_profile: {
      core_traits: archetype.coreTraits,
      needs: archetype.needs,
      avoid: archetype.avoid,
      sample_retreats: archetype.sampleRetreats,
    },
    archetype_answers: archetypeAnswers,
    todays_feeling: archetype.legacyProfile.todaysFeeling,
    experience_kind: archetype.legacyProfile.experienceKind,
    life_season: archetype.legacyProfile.lifeSeason,
  };
}
