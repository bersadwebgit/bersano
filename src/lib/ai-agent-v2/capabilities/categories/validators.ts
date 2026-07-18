import { CategoryCreateSchema } from './schemas';

export const validators = {
  categoryCreate: (data: unknown) => CategoryCreateSchema.parse(data),
};
export { validators as categoryValidators };
