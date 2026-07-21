import { OrderUpdateStatusSchema } from './schemas';

export const validators = {
  orderUpdateStatus: (data: unknown) => OrderUpdateStatusSchema.parse(data),
};
export { validators as orderValidators };
