import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInCalendarDays, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDayNumber(capturedAt: string, journeyCreatedAt: string): number {
  const captureDate = parseISO(capturedAt);
  const journeyStartDate = parseISO(journeyCreatedAt);
  return differenceInCalendarDays(captureDate, journeyStartDate) + 1;
}
