import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names and resolves conflicting Tailwind utilities
 * (last one wins). Required by every shadcn/ui component.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
