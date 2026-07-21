import { DiscountCreateSchema } from './schemas';

export const validators = {
  discountCreate: (data: unknown) => DiscountCreateSchema.parse(data),
};
export { validators as discountValidators };
