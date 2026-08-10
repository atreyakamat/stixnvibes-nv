import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid("Invalid UUID").optional(),
  email: z.string().email("Invalid email").optional().nullable(),
});

export function validateUser(data: unknown) {
  return UserSchema.safeParse(data);
}
