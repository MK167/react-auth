import { z } from 'zod';

export const checkoutSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  address:   z.string().min(5, 'Enter a valid street address'),
  city:      z.string().min(2, 'City is required'),
  zip:       z.string().regex(/^\d{4,10}$/, 'Enter a valid ZIP / postal code'),

  // Accepts "1234 5678 9012 3456" or "1234567890123456"
  cardNumber: z
    .string()
    .regex(/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/, 'Enter a valid 16-digit card number'),

  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Format: MM/YY'),

  cvv: z
    .string()
    .regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/**
 * Payment simulation rule (mirrors Stripe test cards pattern):
 *   Card starting with "0000" → payment declined
 *   Any other valid card     → payment approved
 */
export function isDeclinedCard(cardNumber: string): boolean {
  return cardNumber.replace(/[\s-]/g, '').startsWith('0000');
}
