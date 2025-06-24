#!/usr/bin/env node

// Simple test script to verify AI Gateway configuration
// Run with: node test-gateway.js

import { gateway } from "@vercel/ai-sdk-gateway";
import { generateText } from "ai";

async function testGateway() {
	console.debug("Testing Vercel AI Gateway configuration...");

	try {
		// Test gateway model
		const model = gateway("openai/gpt-3.5-turbo");

		const { text } = await generateText({
			model,
			prompt: 'Say "Hello from Vercel AI Gateway!" in exactly 5 words.',
			temperature: 0.1,
			maxTokens: 20,
		});

		console.debug("✅ Success! Gateway response:", text);
	} catch (error) {
		console.error("❌ Gateway test failed:", error.message);

		if (
			error.message.includes("authentication") ||
			error.message.includes("401")
		) {
			console.debug("\n💡 To fix authentication issues:");
			console.debug(
				"1. For local development: Run `vc env pull` to get authentication token",
			);
			console.debug(
				"2. For production: Deploy to Vercel for automatic authentication",
			);
			console.debug(
				"3. Make sure you have the Vercel CLI installed: `npm i -g vercel`",
			);
		}
	}
}

testGateway();
