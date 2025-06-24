import { gateway } from "@ai-sdk/gateway";
import type { LanguageModel } from "ai";

export function getModel(): LanguageModel {
	//const aiProvider = 'gateway';
	//console.debug(`[AI] Using provider: ${aiProvider}, OIDC: `, process.env.VERCEL_OIDC_TOKEN);

	// Use Vercel AI Gateway if enabled (default)
	//if (aiProvider.toLowerCase() === 'gateway') {
	const gatewayModel = process.env.AI_GATEWAY_MODEL || "openai/gpt-3.5-turbo";
	return gateway(gatewayModel);
	//}

	// // Fallback to direct provider integration
	// switch (aiProvider.toLowerCase()) {
	//   case 'openai':
	//     return openai('gpt-3.5-turbo');
	//   case 'anthropic':
	//     return anthropic('claude-3-haiku-20240307');
	//   case 'google':
	//     return google('gemini-pro');
	//   default:
	//     throw new Error(`Unsupported AI provider: ${aiProvider}. Use 'gateway', 'openai', 'anthropic', or 'google'.`);
	// }
}
