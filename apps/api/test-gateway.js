#!/usr/bin/env node

// Simple test script to verify AI Gateway configuration
// Run with: node test-gateway.js

import { generateText } from "ai";
import { gateway } from "@vercel/ai-sdk-gateway";

async function testGateway() {
	console.log("Testing Vercel AI Gateway configuration...");

	try {
		// Test gateway model
		const model = gateway("openai/gpt-3.5-turbo");

		const { text } = await generateText({
			model,
			prompt: 'Say "Hello from Vercel AI Gateway!" in exactly 5 words.',
			temperature: 0.1,
			maxTokens: 20,
		});

		console.log("✅ Success! Gateway response:", text);
	} catch (error) {
		console.error("❌ Gateway test failed:", error.message);

		if (
			error.message.includes("authentication") ||
			error.message.includes("401")
		) {
			console.log("\n💡 To fix authentication issues:");
			console.log(
				"1. For local development: Run `vc env pull` to get authentication token",
			);
			console.log(
				"2. For production: Deploy to Vercel for automatic authentication",
			);
			console.log(
				"3. Make sure you have the Vercel CLI installed: `npm i -g vercel`",
			);
		}
	}
}

testGateway();
