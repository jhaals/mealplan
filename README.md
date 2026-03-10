# MealPlan

Home Assistant add-on for meal planning with a drag-and-drop interface.

## Installation

1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Click the three-dot menu → **Repositories**
3. Add `https://github.com/jhaals/mealplan`
4. Install and start the **MealPlan** add-on
5. Open `http://homeassistant.local:3001`

## Configuration

```yaml
port: 3001                 # Web interface port (optional, default: 3001)
trmnl_webhook_url: ""      # TRMNL e-ink display webhook URL (optional)
google_api_key: ""         # Google AI Studio key for shopping list sorting (optional)
language: "en"             # UI language: "en" or "sv" (optional)
```

### TRMNL

Get your webhook URL from your TRMNL plugin settings (`https://usetrmnl.com/api/custom_plugins/YOUR_PLUGIN_UUID`). When configured, the meal plan is automatically pushed to the device on changes.

### Google AI shopping list sorting

Get an API key at https://aistudio.google.com/apikey. When configured, enables AI-powered sorting of the shopping list grouped by store section.

## Data & Backups

Meal plan data is stored in `/data/mealplan.db` and included automatically in Home Assistant backups.

## Troubleshooting

- **Add-on won't start** - Check logs; if port 3001 is in use, change it in configuration
- **"Meal plan not found"** - Restart the add-on to reinitialize the database
- **Reset database** - Stop add-on, delete `/data/mealplan.db`, restart

## License

MIT
