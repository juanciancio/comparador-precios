import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CategorySchema = z.object({
  path: z.string(),
  product_count: z.number(),
});
export class CategoryDto extends createZodDto(CategorySchema) {}

export const CategoriesResponseSchema = z.array(CategorySchema);
export class CategoriesResponseDto extends createZodDto(CategoriesResponseSchema) {}

export type Category = z.infer<typeof CategorySchema>;
