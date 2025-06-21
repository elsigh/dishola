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
                query: {
                  type: 'string',
                  description: 'The search query used'
                },
                location: {
                  type: 'string',
                  description: 'The location searched'
                },
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      dishName: {
                        type: 'string',
                        description: 'Name of the dish'
                      },
                      cuisine: {
                        type: 'string',
                        description: 'Cuisine type (e.g., Italian, Mexican, Asian)'
                      },
                      restaurant: {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string',
                            description: 'Restaurant name'
                          },
                          address: {
                            type: 'string',
                            description: 'Restaurant address'
                          },
                          website: {
                            type: 'string',
                            description: 'Restaurant website URL'
                          },
                          doordashUrl: {
                            type: 'string',
                            description: 'DoorDash ordering link'
                          }
                        }
                      },
                      description: {
                        type: 'string',
                        description: 'Dish description'
                      },
                      estimatedPrice: {
                        type: 'string',
                        description: 'Estimated price range'
                      }
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
    const results = await getRestaurantRecommendations(parsedQuery, location, locationInfo);
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
  cuisine: string;
  restaurant: {
    name: string;
    address: string;
    website: string;
    doordashUrl: string;
  };
  description: string;
  estimatedPrice: string;
}

async function parseUserQuery(query: string): Promise<ParsedQuery> {
  const prompt = `Parse this food search query into structured data. Extract:
- dishName: specific dish or food item
- cuisine: nationality/type (Italian, Mexican, Asian, American, etc.)
- dietaryRestrictions: any mentioned (vegetarian, vegan, gluten-free, etc.)
- priceRange: if mentioned (budget, mid-range, upscale)

Query: "${query}"

Respond with valid JSON only:`;

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

async function getRestaurantRecommendations(parsedQuery: ParsedQuery, location: string, locationInfo: { lat: string, long: string, address?: string }): Promise<RestaurantResult[]> {
  const prompt = `Find restaurants near (${locationInfo.lat}, ${locationInfo.long})${locationInfo.address ? ` (${locationInfo.address})` : ''} that serve ${parsedQuery.dishName} (${parsedQuery.cuisine} cuisine).

Return exactly 5 restaurant recommendations as a JSON array with this structure:
[{
  "dishName": "specific dish name",
  "cuisine": "cuisine type",
  "restaurant": {
    "name": "restaurant name",
    "address": "full address",
    "website": "https://restaurant-website.com",
    "doordashUrl": "https://doordash.com/store/restaurant-name"
  },
  "description": "dish description",
  "estimatedPrice": "$15-20"
}]

Make realistic recommendations for real restaurants. Include proper DoorDash URLs.`;

  try {
    const response = await generateAIResponse(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error('Restaurant recommendation error:', error);
    // Return fallback data
    return [{
      dishName: parsedQuery.dishName,
      cuisine: parsedQuery.cuisine,
      restaurant: {
        name: "Local Restaurant",
        address: locationInfo.address || `${locationInfo.lat},${locationInfo.long}`,
        website: "https://example.com",
        doordashUrl: "https://doordash.com"
      },
      description: `Delicious ${parsedQuery.dishName} at a local restaurant`,
      estimatedPrice: "$12-18"
    }];
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