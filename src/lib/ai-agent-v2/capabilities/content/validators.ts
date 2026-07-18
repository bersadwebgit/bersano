import { BlogPostCreateSchema } from './schemas';

export const validators = {
  blogPostCreate: (data: unknown) => BlogPostCreateSchema.parse(data),
};
export { validators as contentValidators };
