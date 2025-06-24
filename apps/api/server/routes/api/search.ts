import { generateText } from 'ai';
import { setHeader } from 'h3';
import { getModel } from '../../../lib/ai';

defineRouteMeta({
  openAPI: {
    tags: ['Search'],
    summary: 'Search for dishes at restaurants',
    description: 'Search for dishes at restaurants using AI-powered query parsing and restaurant recommendations',
    parameters: [
      {
        in: 'query',
        name: 'q',
        required: true,
        description: 'Search query/prompt for dishes',
        schema: {
          type: 'string',
          example: 'spicy pasta'
        }
      },
      {
        in: 'query',
        name: 'location',
        required: true,
        description: 'Location to search in',
        schema: {
          type: 'string',
          example: 'New York, NY'
        }
      }
    ],
    responses: {
      200: {
        description: 'Successful search results',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'The search query used' },
                location: { type: 'string', description: 'The location searched' },
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      dishName: { type: 'string', description: 'Name of the dish' },
                      dishImageUrl: { type: 'string', description: 'Image URL of the dish' },
                      cuisine: { type: 'string', description: 'Cuisine type (e.g., Italian, Mexican, Asian)' },
                      restaurant: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: 'Restaurant name' },
                          address: { type: 'string', description: 'Restaurant address' },
                          lat: { type: 'string', description: 'Restaurant latitude' },
                          lng: { type: 'string', description: 'Restaurant longitude' },
                          website: { type: 'string', description: 'Restaurant website URL' }
                        }
                      },
                      description: { type: 'string', description: 'Dish description' },
                      rating: { type: 'string', description: 'Dish rating (e.g., 4.5)' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request - missing required parameters',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                statusCode: { type: 'number' },
                statusMessage: { type: 'string' }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                statusCode: { type: 'number' },
                statusMessage: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
});

export default defineEventHandler(async (event) => {
  // CORS headers
  setHeader(event, 'Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://dishola.com' : 'http://localhost:3000');
  setHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (event.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  // Location fallback logic
  function getLocationFromRequest(event: any) {
    const query = getQuery(event);
    // 1. Use query params if present
    const lat = typeof query.lat === 'string' ? query.lat : Array.isArray(query.lat) ? query.lat[0] : undefined;
    const long = typeof query.long === 'string' ? query.long : Array.isArray(query.long) ? query.long[0] : undefined;
    if (lat && long) {
      return {
        lat,
        long,
        address: typeof query.address === 'string' ? query.address : undefined
      };
    }
    // 2. Try Vercel headers
    const headers = event.node.req.headers;
    const headerLat = headers['x-vercel-ip-latitude'];
    const headerLong = headers['x-vercel-ip-longitude'];
    const city = headers['x-vercel-ip-city'];
    const region = headers['x-vercel-ip-country-region'];
    const country = headers['x-vercel-ip-country'];
    if (headerLat && headerLong) {
      return {
        lat: headerLat,
        long: headerLong,
        address: [city, region, country].filter(Boolean).join(', ')
      };
    }
    // 3. Fallback to Vercel HQ
    return {
      lat: '37.7897',
      long: '-122.3942',
      address: '100 First St, San Francisco, CA'
    };
  }

  const query = getQuery(event);
  const locationInfo = getLocationFromRequest(event);
  
  if (!query.q) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameter: q (query) is required'
    });
  }

  const searchPrompt = query.q as string;
  const location = locationInfo.address || `${locationInfo.lat},${locationInfo.long}`;

  const headers = event.node.req.headers;
  const city = headers['x-vercel-ip-city'];
  const postal = headers['x-vercel-ip-postal-code'];

  let displayLocation: string;
  if (city && postal) {
    displayLocation = `${city} ${postal}`;
  } else {
    displayLocation = `${locationInfo.lat},${locationInfo.long}`;
  }

  try {
    // Parse the user query to extract structured data
    const parsedQuery = await parseUserQuery(searchPrompt);
    // Get restaurant recommendations based on parsed query and location
    const results = await getRestaurantRecommendations(parsedQuery, locationInfo);
    return {
      query: searchPrompt,
      location: location,
      lat: locationInfo.lat,
      long: locationInfo.long,
      displayLocation,
      parsedQuery: parsedQuery,
      results: results
    };
  } catch (error) {
    console.error('Search error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to search dishes'
    });
  }
});

interface ParsedQuery {
  dishName: string;
  cuisine: string;
  dietaryRestrictions?: string[];
  priceRange?: string;
}

interface RestaurantResult {
  dishName: string;
  dishImageUrl: string;
  cuisine: string;
  restaurant: {
    name: string;
    address: string;
    lat: string;
    lng: string;
    website: string;
  };
  description: string;
  rating: string;
}

async function parseUserQuery(query: string): Promise<ParsedQuery> {
  const prompt = `Parse this food search query into structured data. Extract:
- dishName: specific dish or food item
- cuisine: nationality/type (Italian, Mexican, Asian, American, etc.)

Query: "${query}"

Respond with valid, strict JSON only. Do not include comments, trailing commas, or single quotes. Only use double quotes for property names and string values.`;

  try {
    const response = await generateAIResponse(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('Query parsing error:', error);
    // Fallback parsing
    return {
      dishName: query,
      cuisine: 'Any',
    };
  }
}

async function getRestaurantRecommendations(parsedQuery: ParsedQuery, locationInfo: { lat: string, long: string }): Promise<RestaurantResult[]> {
  const prompt = `
Return exactly 5 exceptional dish recommendations for ${parsedQuery.dishName} (${parsedQuery.cuisine} cuisine very-nearby to (${locationInfo.lat}, ${locationInfo.long}) as a JSON array with this structure:
[
  {
    "dishName": "specific dish name",
    "dishImageUrl": "A real image URL of the dish from the restaurant's website if available, or a high-quality public image ",
    "cuisine": "cuisine type",
    "restaurant": {
      "name": "restaurant name",
      "address": "full address",
      "lat": "latitude of the restaurant",
      "lng": "longitude of the restaurant",
      "website": "Official restaurant website or null if not available"
    },
    "description": "dish description",
    "rating": "rating out of 5 from google maps reviews"
  }
]
Never use example.com or any other fake or placeholder domain for dishImageUrl. Only use real, direct image URLs from reputable sources (e.g., Wikimedia Commons, Unsplash, or the restaurant's real website). If you cannot find a real image, use a relevant Unsplash or Wikimedia Commons image for the dish name.
Respond with valid, strict JSON only. Do not include comments, trailing commas, or single quotes. 
Only use double quotes for property names and string values.
`;

  // Runtime check: ensure all required values are present in the prompt string
  if (
    prompt.indexOf(parsedQuery.dishName) === -1 ||
    prompt.indexOf(parsedQuery.cuisine) === -1 ||
    prompt.indexOf(locationInfo.lat) === -1 ||
    prompt.indexOf(locationInfo.long) === -1
  ) {
    throw new Error("Prompt is missing required search parameters.");
  }

  try {
    const response = await generateAIResponse(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('Restaurant recommendation error:', error);
    return [];
  }
}

async function generateAIResponse(prompt: string): Promise<string> {
  const model = getModel();
  const { text } = await generateText({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });
  return text;
}