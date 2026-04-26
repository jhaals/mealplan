import Anthropic from "@anthropic-ai/sdk";
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
 * Get Anthropic client and validate API key
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured in environment variables",
    );
  }

  return new Anthropic({ apiKey });
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
    const client = getAnthropicClient();

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

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (!content || content.type !== "text") {
      throw new Error("No response from Anthropic");
    }

    // Extract JSON from the response (handle possible markdown code blocks)
    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Anthropic response");
    }

    // Parse the JSON response
    const parsed = JSON.parse(jsonMatch[0]);

    let sortedItems: string[];
    if (parsed.items && Array.isArray(parsed.items)) {
      sortedItems = parsed.items;
    } else if (Array.isArray(parsed)) {
      // Fallback for backwards compatibility
      sortedItems = parsed;
    } else if (parsed.sortedItems && Array.isArray(parsed.sortedItems)) {
      sortedItems = parsed.sortedItems;
    } else {
      throw new Error("Unexpected response format from Anthropic");
    }

    // Validate that all items are present
    if (sortedItems.length !== items.length) {
      console.warn(
        "Anthropic returned different number of items, falling back to original order",
      );
      console.warn(`Input items (${items.length}):`, items);
      console.warn(`Anthropic returned (${sortedItems.length}):`, sortedItems);
      return items;
    }

    // Validate that all original items are present (case-insensitive)
    const originalSet = new Set(items.map((i) => i.toLowerCase()));
    const sortedSet = new Set(sortedItems.map((i) => i.toLowerCase()));

    for (const item of originalSet) {
      if (!sortedSet.has(item)) {
        console.warn(
          "Anthropic response missing items, falling back to original order",
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
