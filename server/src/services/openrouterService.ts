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
 * Get OpenRouter configuration and validate API key
 */
export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured in environment variables",
    );
  }

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
  };
}

/**
 * Extract sorted items array from a parsed OpenRouter JSON response
 */
function extractSortedItems(parsed: unknown): string[] {
  if (Array.isArray(parsed)) {
    return parsed as string[];
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as string[];
    if (Array.isArray(obj.sortedItems)) return obj.sortedItems as string[];
  }
  throw new Error("Unexpected response format from OpenRouter");
}


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
    const { apiKey, model } = getOpenRouterConfig();

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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/jhaals/mealplan',
        'X-Title': 'MealPlan Shopping List Sorter',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenRouter");
    }

    // Parse JSON - extract from markdown code blocks if the model wrapped the response
    let jsonContent = content.trim();
    const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1];
    }

    const parsed = JSON.parse(jsonContent) as unknown;

    // Determine sorted items from response (supports {items:[]}, {sortedItems:[]}, or plain array)
    let sortedItems: string[];
    try {
      sortedItems = extractSortedItems(parsed);
    } catch {
      throw new Error("Unexpected response format from OpenRouter");
    }

    // Validate that all items are present
    if (sortedItems.length !== items.length) {
      console.warn(
        "OpenRouter returned different number of items, falling back to original order",
      );
      console.warn(`Input items (${items.length}):`, items);
      console.warn(`OpenRouter returned (${sortedItems.length}):`, sortedItems);
      return items;
    }

    // Validate that all original items are present (case-insensitive)
    const originalSet = new Set(items.map((i) => i.toLowerCase()));
    const sortedSet = new Set(sortedItems.map((i) => i.toLowerCase()));

    for (const item of originalSet) {
      if (!sortedSet.has(item)) {
        console.warn(
          "OpenRouter response missing items, falling back to original order",
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
