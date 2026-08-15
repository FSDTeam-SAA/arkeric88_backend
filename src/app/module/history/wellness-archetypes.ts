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

function isNewQuestionnaire(answers: Record<string, unknown>): boolean {
  return [
    'break_from',
    'arrival_priority',
    'retreat_structure',
    'reset_style',
    'physical_intensity',
    'travel_party',
    'spirituality',
    'travel_timing',
    'planning_service',
    'preferred_setting',
    'budget_per_night',
    'trip_length',
    'transform_focus',
  ].every((key) => key in answers);
}

const newQuestionnaireValues = {
  break_from: ['noise_stimulation', 'responsibility_decisions', 'routine_repetition', 'emotional_heaviness'],
  arrival_priority: ['breathtaking_view', 'silence_privacy', 'warmth_water_sunshine', 'beautiful_design_service'],
  retreat_structure: ['almost_none', 'optional_rituals', 'one_daily_anchor', 'full_program'],
  reset_style: ['digital_disconnection', 'sensory_indulgence', 'creative_inspiration', 'doing_nothing'],
  physical_intensity: ['gentle', 'moderate', 'challenging'],
  travel_party: ['solo', 'couple', 'small_group', 'family'],
  spirituality: ['none', 'light', 'moderate', 'deep'],
  planning_service: ['loose', 'well_planned', 'hour_by_hour'],
  preferred_setting: ['mountains', 'ocean_beach', 'jungle_rainforest', 'desert', 'countryside_farmland', 'lake', 'city_urban'],
  trip_length: ['1_3_nights', '4_7_nights', '1_2_weeks', '2_plus_weeks'],
  transform_focus: [
    'Burnout Recovery', 'Longevity', 'Detox', 'Weight Loss', 'Spiritual Growth',
    'Emotional Healing', 'Nervous System Reset', 'Fitness', 'Creativity',
    'Relationship Repair', 'Community', 'Sleep', 'Digital Detox', 'Cultural Immersion',
  ],
  restriction_codes: ['no_hiking', 'no_water_activities', 'no_long_drives', 'no_high_impact'],
} as const;

function validateNewQuestionnaire(answers: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...answers };
  for (const [key, allowed] of Object.entries(newQuestionnaireValues)) {
    if (key === 'preferred_setting' || key === 'transform_focus' || key === 'restriction_codes') continue;
    normalized[key] = requireAllowedString(answers, key, [...allowed]);
  }

  const settings = answers.preferred_setting;
  if (!Array.isArray(settings) || settings.some((item) => typeof item !== 'string' || !(newQuestionnaireValues.preferred_setting as readonly string[]).includes(item))) {
    throw new BadRequestException('Invalid preferred_setting');
  }
  normalized.preferred_setting = [...new Set(settings)];

  const focuses = answers.transform_focus;
  if (!Array.isArray(focuses) || focuses.length === 0 || focuses.length > 3 || focuses.some((item) => typeof item !== 'string' || !(newQuestionnaireValues.transform_focus as readonly string[]).includes(item))) {
    throw new BadRequestException('transform_focus must contain one to three canonical values');
  }
  normalized.transform_focus = [...new Set(focuses)];

  const restrictions = answers.activity_restrictions;
  if (!restrictions || typeof restrictions !== 'object' || Array.isArray(restrictions)) {
    throw new BadRequestException('activity_restrictions must include text and codes');
  }
  const { text, codes } = restrictions as Record<string, unknown>;
  if (typeof text !== 'string' || !Array.isArray(codes) || codes.some((code) => typeof code !== 'string' || !(newQuestionnaireValues.restriction_codes as readonly string[]).includes(code))) {
    throw new BadRequestException('Invalid activity_restrictions');
  }
  normalized.activity_restrictions = { text: text.trim(), codes: [...new Set(codes)] };

  const timing = normalized.travel_timing;
  const months = answers.travel_months;
  if (timing === 'flexible') {
    if (months !== undefined) throw new BadRequestException('Flexible travel timing must not include travel_months');
  } else if (!Array.isArray(months) || months.length === 0 || months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) {
    throw new BadRequestException('Specific travel timing requires one or more month numbers');
  } else {
    normalized.travel_months = [...new Set(months)];
  }

  const budget = Number(answers.budget_per_night);
  if (!Number.isFinite(budget) || budget < 0) throw new BadRequestException('budget_per_night must be a positive number');
  if (typeof answers.budget_open_ended !== 'boolean') throw new BadRequestException('budget_open_ended is required');
  normalized.budget_per_night = budget;
  normalized.budget_open_ended = answers.budget_open_ended;
  normalized.currency = 'USD';

  const partyDetails = answers.party_details;
  if (normalized.travel_party === 'family') {
    const details = partyDetails as Record<string, unknown> | undefined;
    if (!details || !Number.isInteger(details.adults) || (details.adults as number) < 1 || !Number.isInteger(details.children) || (details.children as number) < 0) {
      throw new BadRequestException('Family travel requires adult and child counts');
    }
  }
  if (normalized.travel_party === 'small_group' && partyDetails !== undefined) {
    const size = (partyDetails as Record<string, unknown>).party_size;
    if (!Number.isInteger(size) || (size as number) < 2) throw new BadRequestException('Small group party_size must be at least 2');
  }
  return normalized;
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

  // The new wellness flow has a different contract from the legacy
  // archetype/birthdate questionnaire. Keep it normalized for the existing
  // city recommendation pipeline until the versioned retreat API is live.
  if (isNewQuestionnaire(answers)) {
    const newAnswers = validateNewQuestionnaire(answers);
    const transformFocus = Array.isArray(answers.transform_focus)
      ? answers.transform_focus.join(', ')
      : '';
    const travelPeriod = typeof answers.travel_period === 'string'
      ? answers.travel_period
      : typeof answers.travel_timing === 'string'
        ? answers.travel_timing
        : '';

    return {
      ...newAnswers,
      archetype_id: archetype.id,
      selected_archetype: archetype.id,
      archetype_name: archetype.name,
      archetype_profile: {
        core_traits: archetype.coreTraits,
        needs: archetype.needs,
        avoid: archetype.avoid,
        sample_retreats: archetype.sampleRetreats,
      },
      todays_feeling: String(answers.break_from || ''),
      experience_kind: transformFocus,
      life_season: travelPeriod,
    };
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
