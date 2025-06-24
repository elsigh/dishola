import { createGatewayProvider } from '@ai-sdk/gateway';
import type { LanguageModel } from "ai";

const gateway = createGatewayProvider({
  apiKey: process.env.GATEWAY_API_KEY,
})

const fallbackModel = "openai/gpt-4-turbo"
//const fallbackModel = "openai/gpt-3.5-turbo"
//const fallbackModel = "google/gemini-2.0-flash"
//const fallbackModel = "google/gemini-2.5-pro"

export function getModel(): LanguageModel {
	const gatewayModel = process.env.AI_GATEWAY_MODEL || fallbackModel;
	// @ts-ignore
	return gateway(gatewayModel)
}
