import 'reflect-metadata';
import { HttpException } from '@nestjs/common';
import { PaymentService } from './payment.service';

describe('PaymentService Velari migration guard', () => {
  it('rejects a legacy questionnaire before creating a Stripe payment intent', async () => {
    const service = new PaymentService({} as never, {} as never);

    await expect(
      service.createPaymentIntent(
        {
          amount: 49,
          questions_answers: { selected_archetype: 'legacy' },
        },
        '507f1f77bcf86cd799439011',
      ),
    ).rejects.toMatchObject<HttpException>({ status: 422 });
  });
});
