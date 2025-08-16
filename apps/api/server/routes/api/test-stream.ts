import { defineEventHandler, setHeader } from "h3"
import { setCorsHeaders } from "../../lib/cors"
import { createLogger } from "../../lib/logger"

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "test-stream", disable: true })

  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "OPTIONS"] })
  if (corsResponse) return corsResponse

  logger.info("Starting manual test stream")
  
  // Set SSE headers manually
  setHeader(event, "Content-Type", "text/event-stream")
  setHeader(event, "Cache-Control", "no-cache, no-store, must-revalidate")
  setHeader(event, "Connection", "keep-alive")
  
  // Manual SSE sending function
  const sendSSE = (data: any) => {
    const sseData = `data: ${JSON.stringify(data)}\n\n`
    event.node.res.write(sseData)
    logger.info("Sent SSE data", { data })
  }

  try {
    logger.info("Sending test messages")
    
    // Send test messages
    sendSSE({ message: "Test message 1", timestamp: Date.now() })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    sendSSE({ message: "Test message 2", timestamp: Date.now() })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    sendSSE({ message: "Test completed", timestamp: Date.now() })
    
    logger.info("All test messages sent, ending response")
    
    // End the response
    event.node.res.end()
  } catch (error) {
    logger.error("Manual test stream error", { error })
    throw error
  }
  
  // Return to satisfy TypeScript (though the response is already ended)
  return
})