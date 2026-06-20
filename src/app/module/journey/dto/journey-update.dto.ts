import { PartialType } from '@nestjs/swagger';
import { CreateJourneyDto } from './journey-create.dto';

export class UpdateJourneyDto extends PartialType(CreateJourneyDto) {}