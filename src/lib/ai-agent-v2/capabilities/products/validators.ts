import { ProductCreateSchema, ProductUpdateSchema } from './schemas';

export const validators = {
  productCreate: (data: unknown) => ProductCreateSchema.parse(data),
  productUpdate: (data: unknown) => ProductUpdateSchema.parse(data),
};
export { validators as productValidators };
