import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Capitalizes the first letter of every word in string.
 * @param str The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return str
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
