import { GoogleGenerativeAI } from "@google/generative-ai";
import i18n from '../locales';

/**
 * Get the default sorting prompt based on current language
 */
export function getDefaultSortingPrompt(): string {
  return i18n.t('defaultSortingPrompt');
}

/**
 * Exported for backwards compatibility
 * @deprecated Use getDefaultSortingPrompt() instead
 */
export const DEFAULT_SORTING_PROMPT = getDefaultSortingPrompt();

/**
 * Get Gemini configuration and validate API key
 */
export function getGeminiConfig() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not configured in environment variables",
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Sort shopping items using AI based on store walking path
 * Returns sorted array of item names
 */
export async function sortShoppingItems(
  items: string[],
  customPrompt?: string
): Promise<string[]> {
  if (items.length <= 1) {
    return items;
  }

  try {
    const genAI = getGeminiConfig();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "string"
              }
            }
          },
          required: ["items"]
        }
      },
    });

    // Use custom prompt if provided, otherwise default localized prompt
    const basePrompt = customPrompt || getDefaultSortingPrompt();
    const itemsInstructions = i18n.t('sortingItemsInstructions');
    const returnInstruction = i18n.language === 'sv'
      ? `VIKTIGT: Du MÅSTE returnera ALLA ${items.length} varor i JSON-objektet {"items": [...]}. Hoppa inte över några varor.`
      : `IMPORTANT: You MUST return ALL ${items.length} items in the JSON object {"items": [...]}. Do not skip any items.`;

    const prompt = `${basePrompt}

${itemsInstructions}
${items.join("\n")}

${returnInstruction}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error("No response from Gemini");
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // With the schema, response should be {items: [...]}
    let sortedItems: string[];
    if (parsed.items && Array.isArray(parsed.items)) {
      sortedItems = parsed.items;
    } else if (Array.isArray(parsed)) {
      // Fallback for backwards compatibility
      sortedItems = parsed;
    } else if (parsed.sortedItems && Array.isArray(parsed.sortedItems)) {
      sortedItems = parsed.sortedItems;
    } else {
      throw new Error("Unexpected response format from Gemini");
    }

    // Validate that all items are present
    if (sortedItems.length !== items.length) {
      console.warn(
        "Gemini returned different number of items, falling back to original order",
      );
      console.warn(`Input items (${items.length}):`, items);
      console.warn(`Gemini returned (${sortedItems.length}):`, sortedItems);
      return items;
    }

    // Validate that all original items are present (case-insensitive)
    const originalSet = new Set(items.map((i) => i.toLowerCase()));
    const sortedSet = new Set(sortedItems.map((i) => i.toLowerCase()));

    for (const item of originalSet) {
      if (!sortedSet.has(item)) {
        console.warn(
          "Gemini response missing items, falling back to original order",
        );
        return items;
      }
    }

    return sortedItems;
  } catch (error) {
    console.error("Error sorting items with AI:", error);
    // Fallback to original order on any error
    return items;
  }
}
