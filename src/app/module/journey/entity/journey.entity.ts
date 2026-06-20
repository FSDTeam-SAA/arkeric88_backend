import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type JourneyDocument = HydratedDocument<Journey>;

@Schema({ timestamps: true })
export class Journey {
  @Prop({
    required: [true, 'Journey title is required'],
    trim: true,
  })
  title: string;

  @Prop({
    type: [String],
    required: [true, 'At least one emotion is required'],
    enum: ['calm', 'adventure', 'romantic', 'luxury', 'cultural'],
    validate: {
      validator: (value: string[]) => Array.isArray(value) && value.length > 0,
      message: 'At least one emotion is required',
    },
  })
  emotion: string[];

  @Prop()
  image: string;

  @Prop({ trim: true })
  tagline: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  description: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: string;
}

export const JourneySchema = SchemaFactory.createForClass(Journey);