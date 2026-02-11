import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Default Swedish grocery store sorting prompt
 */
export const DEFAULT_SORTING_PROMPT = `Du är en hjälpsam assistent som sorterar svenska matvaror enligt en butiks gångstig.

Sortera följande matvaror enligt gångstig i en svensk matbutik. Returnera endast en JSON-array med de sorterade namnen i exakt samma format som de gavs.

Gångstig genom butiken (i ordning):
1. Frukt och grönt (t.ex. äpplen, bananer, tomater, sallad, gurka)
2. Ostar (t.ex. herrgård, präst, brie, cheddar)
3. Chark (t.ex. skinka, salami, korv)
4. Olja (t.ex. olivolja, rapsolja)
5. Kryddor (t.ex. salt, peppar, paprika, oregano)
6. Oliver (t.ex. gröna oliver, svarta oliver)
7. Burkmat (t.ex. tonfisk, bönor, tomater på burk, ketchup)
8. Pasta och korn (t.ex. pasta, ris, couscous, quinoa)
9. Frysmat (t.ex. frysta grönsaker, frysta bär, fryst kyckling eller fisk)
10. Mjöl (t.ex. vetemjöl, bakpulver, jäst)
11. Öl (t.ex. lager, IPA)
12. Kaffe (t.ex. kaffebönor, bryggkaffe)
13. Mejeri (t.ex. mjölk, yoghurt, grädde, smör)
14. Ägg
15. Nötter (t.ex. mandlar, cashew, jordnötter)
16. Toapapper
17. Blöjor
18. Renhållning (t.ex. diskmedel, tvättmedel, rengöring)
19. Godis och glass (t.ex. choklad, lösgodis)

Om en vara inte passar perfekt i en kategori, gissa vart den hör hemma baserat på liknande varor.`;

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
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    // Use custom prompt if provided, otherwise default
    const basePrompt = customPrompt || DEFAULT_SORTING_PROMPT;
    const prompt = `${basePrompt}

Varor att sortera:
${items.join("\n")}

Returnera endast JSON-arrayen, inget annat.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error("No response from Gemini");
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Handle different possible response formats
    let sortedItems: string[];
    if (Array.isArray(parsed)) {
      sortedItems = parsed;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      sortedItems = parsed.items;
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
