import type { H3Event } from "h3"

interface LogContext {
  handler: string
  requestId: string
  method: string
  url: string
}

interface CreateLoggerOptions {
  event: H3Event
  handlerName: string
  disable?: boolean
}

export function createLogger(options: CreateLoggerOptions) {
  const { event, handlerName, disable = false } = options

  // Return no-op logger when disabled
  if (disable) {
    return {
      debug: () => {},
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {}
    }
  }

  const requestId = Math.random().toString(36).substring(2, 15)
  const context: LogContext = {
    handler: handlerName,
    requestId,
    method: event.method || "UNKNOWN",
    url: event.path || "UNKNOWN"
  }

  return {
    debug: (message: string, data?: any) => {
      console.debug(`[${context.handler}:${context.requestId}] ${message}`, data ? { ...data, context } : { context })
    },
    log: (message: string, data?: any) => {
      console.log(`[${context.handler}:${context.requestId}] ${message}`, data ? { ...data, context } : { context })
    },
    warn: (message: string, data?: any) => {
      console.warn(`[${context.handler}:${context.requestId}] ${message}`, data ? { ...data, context } : { context })
    },
    error: (message: string, data?: any) => {
      console.error(`[${context.handler}:${context.requestId}] ${message}`, data ? { ...data, context } : { context })
    },
    info: (message: string, data?: any) => {
      console.info(`[${context.handler}:${context.requestId}] ${message}`, data ? { ...data, context } : { context })
    }
  }
}
