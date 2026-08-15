import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ name: 'validRetreatTravelWindow', async: false })
class ValidRetreatTravelWindowConstraint implements ValidatorConstraintInterface {
  validate(value: RetreatTravelWindowDto): boolean {
    if (!value) return false;
    if (value.mode === TravelWindowMode.FLEXIBLE) {
      return value.season === undefined && value.months === undefined;
    }
    if (value.mode !== TravelWindowMode.SPECIFIC || !value.season) return false;
    return value.season === TravelSeason.CHOOSE_MONTH
      ? Array.isArray(value.months) && value.months.length > 0
      : value.months === undefined;
  }

  defaultMessage(): string {
    return 'travel_window must be flexible without season/months, or specific with a valid season; months are allowed only with choose_month';
  }
}

function IsValidRetreatTravelWindow() {
  return (target: object, propertyKey: string) => {
    registerDecorator({
      name: 'isValidRetreatTravelWindow',
      target: target.constructor,
      propertyName: propertyKey,
      validator: ValidRetreatTravelWindowConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'validRetreatParty', async: false })
class ValidRetreatPartyConstraint implements ValidatorConstraintInterface {
  validate(value: RetreatPartyDto): boolean {
    if (!value) return false;
    if (value.type === PartyType.SOLO)
      return value.adults === 1 && value.children === 0;
    if (value.type === PartyType.COUPLE)
      return value.adults === 2 && value.children === 0;
    if (value.type === PartyType.SMALL_GROUP) return value.adults >= 3;
    return value.type === PartyType.FAMILY && value.adults >= 1;
  }

  defaultMessage(): string {
    return 'party counts must match the selected party type';
  }
}

function IsValidRetreatParty() {
  return (target: object, propertyKey: string) => {
    registerDecorator({
      name: 'isValidRetreatParty',
      target: target.constructor,
      propertyName: propertyKey,
      validator: ValidRetreatPartyConstraint,
    });
  };
}

export enum RetreatArchetype {
  BURNED_OUT_ACHIEVER = 'burned_out_achiever',
  TRANSFORMER = 'transformer',
  SEEKER = 'seeker',
  OPTIMIZER = 'optimizer',
  ESCAPIST = 'escapist',
  RECONNECTOR = 'reconnector',
}

export enum TravelWindowMode {
  FLEXIBLE = 'flexible',
  SPECIFIC = 'specific',
}

export enum TravelSeason {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter',
  CHOOSE_MONTH = 'choose_month',
}

export enum PartyType {
  SOLO = 'solo',
  COUPLE = 'couple',
  SMALL_GROUP = 'small_group',
  FAMILY = 'family',
}

export enum SpiritualityLevel {
  NONE = 'none',
  LIGHT = 'light',
  MODERATE = 'moderate',
  DEEP = 'deep',
}

export enum PhysicalIntensity {
  GENTLE = 'gentle',
  MODERATE = 'moderate',
  CHALLENGING = 'challenging',
}

export enum StructurePreference {
  ALMOST_NONE = 'almost_none',
  OPTIONAL_RITUALS = 'optional_rituals',
  ONE_DAILY_ANCHOR = 'one_daily_anchor',
  FULL_PROGRAM = 'full_program',
}

export enum EscapeFrom {
  NOISE_STIMULATION = 'noise_stimulation',
  RESPONSIBILITY_DECISIONS = 'responsibility_decisions',
  ROUTINE_REPETITION = 'routine_repetition',
  EMOTIONAL_HEAVINESS = 'emotional_heaviness',
}

export enum ArrivalPriority {
  BREATHTAKING_VIEW = 'breathtaking_view',
  SILENCE_PRIVACY = 'silence_privacy',
  WARMTH_WATER_SUNSHINE = 'warmth_water_sunshine',
  BEAUTIFUL_DESIGN_SERVICE = 'beautiful_design_service',
}

export enum ResetStyle {
  DIGITAL_DISCONNECTION = 'digital_disconnection',
  SENSORY_INDULGENCE = 'sensory_indulgence',
  CREATIVE_INSPIRATION = 'creative_inspiration',
  DOING_NOTHING = 'doing_nothing',
}

export enum PlanningServiceLevel {
  LOOSE = 'loose',
  WELL_PLANNED = 'well_planned',
  HOUR_BY_HOUR = 'hour_by_hour',
}

export enum TransformFocus {
  BURNOUT_RECOVERY = 'Burnout Recovery',
  LONGEVITY = 'Longevity',
  DETOX = 'Detox',
  WEIGHT_LOSS = 'Weight Loss',
  SPIRITUAL_GROWTH = 'Spiritual Growth',
  EMOTIONAL_HEALING = 'Emotional Healing',
  NERVOUS_SYSTEM_RESET = 'Nervous System Reset',
  FITNESS = 'Fitness',
  CREATIVITY = 'Creativity',
  RELATIONSHIP_REPAIR = 'Relationship Repair',
  COMMUNITY = 'Community',
  SLEEP = 'Sleep',
  DIGITAL_DETOX = 'Digital Detox',
  CULTURAL_IMMERSION = 'Cultural Immersion',
}

export enum DurationBucket {
  ONE_TO_THREE_NIGHTS = '1_3_nights',
  FOUR_TO_SEVEN_NIGHTS = '4_7_nights',
  ONE_TO_TWO_WEEKS = '1_2_weeks',
  TWO_PLUS_WEEKS = '2_plus_weeks',
}

export enum SettingCode {
  MOUNTAINS = 'mountains',
  OCEAN_BEACH = 'ocean_beach',
  JUNGLE_RAINFOREST = 'jungle_rainforest',
  DESERT = 'desert',
  COUNTRYSIDE_FARMLAND = 'countryside_farmland',
  LAKE = 'lake',
  CITY_URBAN = 'city_urban',
}

export class RetreatPartyDto {
  @IsEnum(PartyType)
  type: PartyType;

  @IsInt()
  @Min(1)
  adults: number;

  @IsInt()
  @Min(0)
  children: number;
}

export class RetreatTravelWindowDto {
  @IsEnum(TravelWindowMode)
  mode: TravelWindowMode;

  @ValidateIf((value) => value.mode === TravelWindowMode.SPECIFIC)
  @IsEnum(TravelSeason)
  season?: TravelSeason;

  @ValidateIf((value) => value.season === TravelSeason.CHOOSE_MONTH)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  months?: number[];
}

export class RetreatRestrictionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codes?: string[];
}

export class RetreatBudgetDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsNumber()
  @Min(0.01)
  per_person_per_night_max: number;

  @IsBoolean()
  open_ended: boolean;
}

export class RetreatDurationDto {
  @IsEnum(DurationBucket)
  bucket: DurationBucket;

  @IsOptional()
  @IsInt()
  @Min(1)
  exact_nights?: number;
}

export class RetreatQuestionnaireDto {
  @IsEnum(RetreatArchetype)
  archetype: RetreatArchetype;

  @IsEnum(EscapeFrom)
  escape_from: EscapeFrom;

  @IsEnum(ArrivalPriority)
  arrival_priority: ArrivalPriority;

  @IsEnum(StructurePreference)
  structure_preference: StructurePreference;

  @IsEnum(ResetStyle)
  reset_style: ResetStyle;

  @IsEnum(PhysicalIntensity)
  physical_intensity: PhysicalIntensity;

  @ValidateNested()
  @Type(() => RetreatPartyDto)
  @IsValidRetreatParty()
  party: RetreatPartyDto;

  @IsEnum(SpiritualityLevel)
  spirituality: SpiritualityLevel;

  @ValidateNested()
  @Type(() => RetreatTravelWindowDto)
  @IsValidRetreatTravelWindow()
  travel_window: RetreatTravelWindowDto;

  @IsEnum(PlanningServiceLevel)
  planning_service_level: PlanningServiceLevel;

  @ValidateNested()
  @Type(() => RetreatRestrictionsDto)
  restrictions: RetreatRestrictionsDto;

  @IsArray()
  @IsEnum(SettingCode, { each: true })
  settings: SettingCode[];

  @ValidateNested()
  @Type(() => RetreatBudgetDto)
  budget: RetreatBudgetDto;

  @ValidateNested()
  @Type(() => RetreatDurationDto)
  duration: RetreatDurationDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsEnum(TransformFocus, { each: true })
  transform_focus: TransformFocus[];
}

export class RequestRetreatRecommendationsDto extends RetreatQuestionnaireDto {
  @IsString()
  @IsNotEmpty()
  payment_intent_id: string;
}
