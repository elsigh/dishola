function getCallerInfo(): string {
  const stack = new Error().stack
  if (!stack) return 'unknown'
  
  // Look for the API route file in the stack
  const lines = stack.split('\n')
  for (const line of lines) {
    const match = line.match(/\/api\/([^\/]+)\.ts/)
    if (match) {
      return `api/${match[1]}`
    }
  }
  
  // Fallback: try to find any server route
  for (const line of lines) {
    const match = line.match(/\/server\/routes\/(.+?)\.ts/)
    if (match) {
      return match[1].replace(/\//g, ':')
    }
  }
  
  return 'unknown-handler'
}

export function log(message: string, data?: any) {
  const handler = getCallerInfo()
  console.log(`[${handler}] ${message}`, data || '')
}

export function debug(message: string, data?: any) {
  const handler = getCallerInfo()
  console.debug(`[${handler}] ${message}`, data || '')
}

export function warn(message: string, data?: any) {
  const handler = getCallerInfo()
  console.warn(`[${handler}] ${message}`, data || '')
}

export function error(message: string, data?: any) {
  const handler = getCallerInfo()
  console.error(`[${handler}] ${message}`, data || '')
}