import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { gateway } from '@vercel/ai-sdk-gateway';

export function getModel() {
  const aiProvider = process.env.AI_PROVIDER || 'gateway';
  
  // Use Vercel AI Gateway if enabled (default)
  if (aiProvider.toLowerCase() === 'gateway') {
    const gatewayModel = process.env.AI_GATEWAY_MODEL || 'openai/gpt-3.5-turbo';
    return gateway(gatewayModel);
  }
  
  // Fallback to direct provider integration
  switch (aiProvider.toLowerCase()) {
    case 'openai': {
      return openai('gpt-3.5-turbo');
    }
    case 'anthropic': {
      return anthropic('claude-3-haiku-20240307');
    }
    case 'google': {
      return google('gemini-pro');
    }
    default:
      throw new Error(`Unsupported AI provider: ${aiProvider}. Use 'gateway', 'openai', 'anthropic', or 'google'.`);
  }
} 