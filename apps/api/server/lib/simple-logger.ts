export function createSimpleLogger(prefix: string) {
  return {
    debug: (message: string, data?: any) => console.debug(`[${prefix}] ${message}`, data || ''),
    log: (message: string, data?: any) => console.log(`[${prefix}] ${message}`, data || ''),
    warn: (message: string, data?: any) => console.warn(`[${prefix}] ${message}`, data || ''),
    error: (message: string, data?: any) => console.error(`[${prefix}] ${message}`, data || ''),
    info: (message: string, data?: any) => console.info(`[${prefix}] ${message}`, data || '')
  }
}

// Usage: const log = createSimpleLogger('taste-recommendations')