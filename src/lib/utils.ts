import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | Timestamp | null | undefined) {
  if (!date) {
    return '';
  }
  const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  return dateObj.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
