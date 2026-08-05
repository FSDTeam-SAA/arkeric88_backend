import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PriceDocument = HydratedDocument<Price>;

@Schema({ timestamps: true })
export class Price {
  @Prop({
    required: [true, 'Price is required'],
    type: Number,
  })
  price: number;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  paymentCategory?: string;
}

export const PriceSchema = SchemaFactory.createForClass(Price);