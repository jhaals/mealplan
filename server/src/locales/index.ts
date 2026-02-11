import i18next from 'i18next';

const defaultLanguage = process.env.LANGUAGE || 'en';

// Swedish AI prompt (existing DEFAULT_SORTING_PROMPT from geminiService.ts)
const svSortingPrompt = `Du är en hjälpsam assistent som sorterar svenska matvaror enligt en butiks gångstig.

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

// English AI prompt (translation of Swedish version)
const enSortingPrompt = `You are a helpful assistant that sorts grocery items according to a store's walking path.

Sort the following grocery items according to the walking path in a typical grocery store. Return only a JSON array with the sorted names in exactly the same format as they were provided.

Walking path through the store (in order):
1. Fruits and vegetables (e.g., apples, bananas, tomatoes, lettuce, cucumber)
2. Cheeses (e.g., cheddar, brie, gouda, parmesan)
3. Deli meats (e.g., ham, salami, sausage)
4. Oils (e.g., olive oil, canola oil)
5. Spices (e.g., salt, pepper, paprika, oregano)
6. Olives (e.g., green olives, black olives)
7. Canned goods (e.g., tuna, beans, canned tomatoes, ketchup)
8. Pasta and grains (e.g., pasta, rice, couscous, quinoa)
9. Frozen foods (e.g., frozen vegetables, frozen berries, frozen chicken or fish)
10. Baking supplies (e.g., flour, baking powder, yeast)
11. Beer (e.g., lager, IPA)
12. Coffee (e.g., coffee beans, ground coffee)
13. Dairy (e.g., milk, yogurt, cream, butter)
14. Eggs
15. Nuts (e.g., almonds, cashews, peanuts)
16. Toilet paper
17. Diapers
18. Cleaning supplies (e.g., dish soap, laundry detergent, cleaning products)
19. Candy and ice cream (e.g., chocolate, bulk candy)

If an item doesn't fit perfectly in a category, make your best guess where it belongs based on similar items.`;

i18next.init({
  lng: defaultLanguage,
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        defaultSortingPrompt: enSortingPrompt,
        sortingItemsInstructions: 'Items to sort:'
      }
    },
    sv: {
      translation: {
        defaultSortingPrompt: svSortingPrompt,
        sortingItemsInstructions: 'Varor att sortera:'
      }
    },
  },
  debug: false, // Suppress i18next promotional messages
});

export default i18next;
