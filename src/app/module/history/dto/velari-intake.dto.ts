import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const RECENT_FEELINGS = [
  'stretched_thin',
  'stuck_in_routine',
  'disconnected',
  'curious',
  'energized',
  'turning_point',
  'content_ready',
  'something_else',
] as const;

export const TRIP_GOALS = [
  'restoration',
  'connection',
  'discovery',
  'adventure',
  'inspiration',
  'celebration',
  'reflection',
  'growth',
] as const;

export const TRIP_PROMPTS = [
  'need_a_break',
  'time_with_someone',
  'celebrating',
  'curious_to_explore',
  'ready_for_change',
  'change_of_scenery',
  'no_particular_reason',
  'something_else',
] as const;

export const PREFERRED_MOMENTS = [
  'food_drinks',
  'art_history_culture',
  'nature_wildlife',
  'beaches_water',
  'movement_adventure',
  'quiet_privacy',
  'meeting_people',
  'spa_wellness',
  'music_nightlife',
  'learning_making',
] as const;

export const PREFERRED_ENVIRONMENTS = [
  'coast',
  'mountains',
  'forest_jungle',
  'desert',
  'countryside',
  'small_town',
  'vibrant_city',
  'surprise_me',
] as const;

export const ACTIVITY_RESTRICTIONS = [
  'mobility_accessibility',
  'food_dietary',
  'no_long_drives',
  'no_intense_activity',
  'no_water_activities',
  'avoid_extreme_heat',
  'avoid_cold_weather',
  'other',
] as const;

export const RESTRICTION_SEVERITIES = ['must_avoid', 'prefer_avoid'] as const;

const TRAVEL_PERIODS = [
  'spring',
  'summer',
  'autumn',
  'winter',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

type RestrictionCode = (typeof ACTIVITY_RESTRICTIONS)[number];
type RestrictionSeverity = (typeof RESTRICTION_SEVERITIES)[number];

function unique(values: unknown[]): boolean {
  return new Set(values).size === values.length;
}

function dateOnlyUtc(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    return null;
  }
  return timestamp;
}

@ValidatorConstraint({ name: 'velariIntakeRules', async: false })
class VelariIntakeRulesConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const intake = args.object as VelariIntakeDto;

    if (!unique(intake.recent_feelings || [])) return false;
    if (!unique(intake.trip_goals || [])) return false;
    if (!unique(intake.preferred_moments || [])) return false;
    if (!unique(intake.preferred_environments || [])) return false;
    if (!unique(intake.activity_restrictions || [])) return false;

    if (
      intake.preferred_environments?.includes('surprise_me') &&
      intake.preferred_environments.length !== 1
    ) {
      return false;
    }

    const adults =
      intake.party_adults ?? (intake.travel_party === 'couple' ? 2 : 1);
    const children = intake.party_children ?? 0;
    const rooms = intake.party_rooms ?? 1;
    if (intake.travel_party === 'solo' && (adults !== 1 || children !== 0))
      return false;
    if (rooms > adults + children) return false;
    if (intake.party_child_ages && intake.party_child_ages.length !== children)
      return false;

    const hasLatitude = intake.departure_latitude !== undefined;
    const hasLongitude = intake.departure_longitude !== undefined;
    if (hasLatitude !== hasLongitude) return false;

    const restrictions = intake.activity_restrictions || [];
    const severityObject = intake.restriction_severity || {};
    if (
      Object.entries(severityObject).some(
        ([key, value]) =>
          !ACTIVITY_RESTRICTIONS.includes(key as RestrictionCode) ||
          !restrictions.includes(key as RestrictionCode) ||
          !RESTRICTION_SEVERITIES.includes(value as RestrictionSeverity),
      )
    ) {
      return false;
    }

    for (const restriction of ACTIVITY_RESTRICTIONS) {
      const flatKey =
        `restriction_severity_${restriction}` as keyof VelariIntakeDto;
      if (!restrictions.includes(restriction) && intake[flatKey] !== undefined)
        return false;
    }

    for (const restriction of restrictions) {
      const flatKey =
        `restriction_severity_${restriction}` as keyof VelariIntakeDto;
      const flatValue = intake[flatKey] as RestrictionSeverity | undefined;
      const objectValue = severityObject[restriction];
      if (!flatValue && !objectValue) return false;
      if (flatValue && objectValue && flatValue !== objectValue) return false;
    }

    if (intake.travel_timing === 'exact_dates') {
      if (!intake.check_in_date || !intake.check_out_date) return false;
      const checkIn = dateOnlyUtc(intake.check_in_date);
      const checkOut = dateOnlyUtc(intake.check_out_date);
      if (checkIn === null || checkOut === null || checkOut <= checkIn)
        return false;

      const today = new Date();
      const todayUtc = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      );
      if (checkIn < todayUtc) return false;

      const nights = (checkOut - checkIn) / 86_400_000;
      if (intake.trip_nights !== undefined && intake.trip_nights !== nights)
        return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Intake contains inconsistent selections, party details, restrictions, coordinates, or travel dates';
  }
}

export class VelariIntakeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsEnum(RECENT_FEELINGS, { each: true })
  recent_feelings: (typeof RECENT_FEELINGS)[number][];

  @Transform(({ value, obj }) =>
    obj.recent_feelings?.includes('something_else') ? value : undefined,
  )
  @ValidateIf((dto: VelariIntakeDto) =>
    dto.recent_feelings?.includes('something_else'),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  recent_feelings_other?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsEnum(TRIP_GOALS, { each: true })
  trip_goals: (typeof TRIP_GOALS)[number][];

  @IsEnum(TRIP_PROMPTS)
  trip_prompt: (typeof TRIP_PROMPTS)[number];

  @Transform(({ value, obj }) =>
    obj.trip_prompt === 'something_else' ? value : undefined,
  )
  @ValidateIf((dto: VelariIntakeDto) => dto.trip_prompt === 'something_else')
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  trip_prompt_other?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsEnum(PREFERRED_MOMENTS, { each: true })
  preferred_moments: (typeof PREFERRED_MOMENTS)[number][];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsEnum(PREFERRED_ENVIRONMENTS, { each: true })
  preferred_environments: (typeof PREFERRED_ENVIRONMENTS)[number][];

  @IsEnum(['mostly_open', 'one_highlight', 'balanced', 'full_days'])
  trip_pace: 'mostly_open' | 'one_highlight' | 'balanced' | 'full_days';

  @IsEnum(['solo', 'couple', 'group', 'family'])
  travel_party: 'solo' | 'couple' | 'group' | 'family';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  party_adults?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  party_children?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  party_rooms?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(17, { each: true })
  party_child_ages?: number[];

  @IsOptional()
  @IsArray()
  @IsEnum(ACTIVITY_RESTRICTIONS, { each: true })
  activity_restrictions?: RestrictionCode[];

  @IsOptional()
  @IsObject()
  restriction_severity?: Partial<Record<RestrictionCode, RestrictionSeverity>>;

  @IsOptional()
  @IsEnum(RESTRICTION_SEVERITIES)
  restriction_severity_mobility_accessibility?: RestrictionSeverity;
  @IsOptional()
  @IsEnum(RESTRICTION_SEVERITIES)
  restriction_severity_food_dietary?: RestrictionSeverity;
  @IsOptional()
  @IsEnum(RESTRICTION_SEVERITIES)
  restriction_severity_no_long_drives?: RestrictionSeverity;
  @IsOptional()
  @IsEnum(RESTRICTION_SEVERITIES)
  restriction_severity_no_intense_activity?: RestrictionSeverity;
  @IsOptional()
  @IsEnum(RESTRICTION_SEVERITIES)
  restriction_severity_no_water_activities?: RestrictionSeverity;
  @IsOptional()
  @IsEnum(RESTRICTION_SEVERITIES)
  restriction_severity_avoid_extreme_heat?: RestrictionSeverity;
  @IsOptional()
  @IsEnum(RESTRICTION_SEVERITIES)
  restriction_severity_avoid_cold_weather?: RestrictionSeverity;
  @IsOptional()
  @IsEnum(RESTRICTION_SEVERITIES)
  restriction_severity_other?: RestrictionSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  restriction_notes?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  departure_location: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  departure_latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  departure_longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  departure_country?: string;

  @IsEnum(['nearby', 'manageable_flight', 'anywhere'])
  travel_distance: 'nearby' | 'manageable_flight' | 'anywhere';

  @IsEnum(['exact_dates', 'flexible', 'month_season'])
  travel_timing: 'exact_dates' | 'flexible' | 'month_season';

  @Transform(({ value, obj }) =>
    obj.travel_timing === 'exact_dates' ? value : undefined,
  )
  @ValidateIf((dto: VelariIntakeDto) => dto.travel_timing === 'exact_dates')
  @IsDateString({ strict: true })
  check_in_date?: string;

  @Transform(({ value, obj }) =>
    obj.travel_timing === 'exact_dates' ? value : undefined,
  )
  @ValidateIf((dto: VelariIntakeDto) => dto.travel_timing === 'exact_dates')
  @IsDateString({ strict: true })
  check_out_date?: string;

  @Transform(({ value, obj }) =>
    obj.travel_timing === 'month_season' ? value : undefined,
  )
  @ValidateIf((dto: VelariIntakeDto) => dto.travel_timing === 'month_season')
  @IsEnum(TRAVEL_PERIODS)
  travel_period?: (typeof TRAVEL_PERIODS)[number];

  @ValidateIf(
    (dto: VelariIntakeDto) =>
      dto.travel_timing !== 'exact_dates' || dto.trip_nights !== undefined,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  trip_nights?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100)
  @Max(7000)
  budget_per_night: number;

  @IsOptional()
  @IsEnum(['USD'])
  currency?: 'USD';

  @Validate(VelariIntakeRulesConstraint)
  private readonly _rules?: never;
}

export function isVelariIntake(value: unknown): value is VelariIntakeDto {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'recent_feelings' in value &&
    'trip_goals' in value &&
    'preferred_moments' in value,
  );
}
