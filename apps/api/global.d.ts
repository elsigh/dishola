// Global types for Nitro/H3 functions
import type { H3Event } from 'h3'

declare global {
  // H3 functions
  const defineEventHandler: typeof import('h3')['defineEventHandler']
  const createError: typeof import('h3')['createError']
  const getHeader: typeof import('h3')['getHeader']
  const setHeader: typeof import('h3')['setHeader']
  const getQuery: typeof import('h3')['getQuery']
  const getRouterParam: typeof import('h3')['getRouterParam']
  const readBody: typeof import('h3')['readBody']
}

export {}