# TRMNL Plugin — Meal Plan

A private [TRMNL](https://usetrmnl.com) plugin that displays meals for **today
and every day after** on a TRMNL e-ink display. Markup is written in TRMNL's
own [Framework](https://trmnl.com/framework) design system (`layout`,
`columns`, `item`/`meta`/`content`, `title_bar`, etc.) so it renders natively
alongside official plugins.

This folder is a standard [`trmnlp`](https://github.com/usetrmnl/trmnlp)
project — it doesn't run as part of the app's build. The app's existing
webhook integration (`server/src/services/trmnlService.ts`) pushes the data
this markup renders.

```
trmnl/
├── .trmnlp.yml          # local dev-server config (not uploaded to TRMNL)
├── mock-data/
│   ├── webhook-payload.json        # sample merge_variables, same shape as the real push
│   └── webhook-payload-empty.json  # the "no meals planned" state
└── src/
    ├── settings.yml     # plugin config (uploaded to TRMNL)
    ├── full.liquid       # full screen: every upcoming day, one column
    ├── half_horizontal.liquid  # top/bottom mashup half: next 2 days, side by side
    ├── half_vertical.liquid    # left/right mashup half: next 4 days, stacked
    └── quadrant.liquid         # 2x2 mashup quarter: next 3 days, stacked
```

## Data shape

The templates consume the `merge_variables` this app already sends to its
TRMNL webhook (see `formatMealPlanForTRMNL` in `trmnlService.ts`):

```
days: [{ date, dayName, formattedDate, meals: string[], mealCount, isToday }]
totalDays, totalMeals, startDate, lastUpdated, displayText
```

Past days are filtered out server-side before the payload is built, so `days`
only ever contains today and the future — the templates don't need to do any
date math.

## Setting it up on TRMNL

1. In the TRMNL dashboard, create a new **Private Plugin** with strategy
   **Webhook**.
2. Open **Edit Markup** and paste each file in `src/` into its matching tab
   (`full.liquid` → Full, `half_horizontal.liquid` → Half horizontal, etc.).
3. Copy the plugin's webhook URL and set it in `server/.env`:
   ```bash
   TRMNL_WEBHOOK_URL=https://usetrmnl.com/api/custom_plugins/YOUR_PLUGIN_UUID
   ```
4. Restart the server (`npm run dev`). It pushes on startup, hourly
   thereafter, and on-demand via the "Push to TRMNL" button in the app header.

## Local iteration (optional)

For faster feedback than round-tripping through a real device, install the
`trmnlp` preview server and run it from this directory:

```bash
gem install trmnl_preview
cd trmnl
trmnlp serve   # preview at http://localhost:4567
```

`trmnlp` re-renders on save, but starts with no data loaded — every view will
look empty until you feed it something. Feed it the mock payload:

```bash
curl -X POST http://localhost:4567/webhook \
  -H 'Content-Type: application/json' \
  --data-binary @mock-data/webhook-payload.json
```

Then open http://localhost:4567/full (or `/half_horizontal`, `/half_vertical`,
`/quadrant`) — it live-reloads on further edits. Swap in
`mock-data/webhook-payload-empty.json` to check the "no meals planned" state.

`mock-data/webhook-payload.json` is hand-written to match the exact shape
`formatMealPlanForTRMNL()` in `server/src/services/trmnlService.ts` sends as
`merge_variables` — `days[]` with `date`/`dayName`/`formattedDate`/`meals`/
`mealCount`/`isToday`, plus `totalDays`/`totalMeals`/`startDate`/`lastUpdated`/
`displayText`. If you change the payload shape in `trmnlService.ts`, update
these fixtures to match.

One wrinkle: TRMNL's hosted service wraps webhook bodies as
`{"merge_variables": {...}, "merge_strategy": "..."}` and unwraps
`merge_variables` into the template namespace for you — that's the envelope
`server/.env`'s real webhook push sends. `trmnlp`'s local `/webhook` doesn't
do that unwrapping; it merges whatever JSON you POST directly into the root
namespace. So the mock files here intentionally contain just the *inner*
`merge_variables` object, not the outer envelope.
