import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function isObject(value: unknown) {
  return typeof value === 'object' && value !== null
}

export function isLogglyConfigured(project: unknown): boolean {
  if (!project || typeof project !== 'object') return false
  const record = project as Record<string, unknown>
  return Boolean(record.logglySubdomain && record.logglyToken)
}
