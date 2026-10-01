import { HttpException } from '@nestjs/common';
import { handleHttpException } from './httpException';

describe('handleHttpException', () => {
  it('preserves structured upstream validation paths', () => {
    const result = handleHttpException(
      new HttpException(
        {
          message: 'AI service request failed',
          detail: [
            {
              loc: ['body', 'budget_per_night'],
              msg: 'Input should be greater than or equal to 100',
            },
          ],
        },
        422,
      ),
    );

    expect(result).toEqual({
      statusCode: 422,
      message: 'AI service request failed',
      errorSources: [
        {
          path: 'body.budget_per_night',
          message: 'Input should be greater than or equal to 100',
        },
      ],
    });
  });
});
