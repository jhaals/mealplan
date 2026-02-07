# MealPlan - Home Assistant Add-on

## About

MealPlan is a mobile-first meal planning application with an intuitive drag-and-drop interface. Plan your weekly meals, organize them by day, and manage your meal schedule effortlessly.

## Features

- **Drag-and-drop interface**: Easily reorganize meals between days
- **Mobile-optimized**: Touch-friendly design for phones and tablets
- **Auto-advancing days**: Quick meal entry workflow
- **Persistent storage**: Meal plans saved in Home Assistant backups
- **Single-user design**: Perfect for personal or household meal planning

## Installation

1. Add this repository to your Home Assistant add-on store
2. Click "Install"
3. Start the add-on
4. Access the web interface

## Configuration

```yaml
port: 3001                    # Web interface port (optional)
trmnl_webhook_url: ""         # TRMNL webhook URL (optional)
```

### Option: `port`

The port number for the web interface. Default: 3001

Change this if port 3001 is already in use by another service.

### Option: `trmnl_webhook_url`

TRMNL webhook URL for pushing meal plans to your TRMNL device (optional).

To enable TRMNL integration:
1. Get your webhook URL from your TRMNL plugin settings
2. The URL format is: `https://usetrmnl.com/api/custom_plugins/YOUR_PLUGIN_UUID`
3. Add it to this configuration option
4. Restart the add-on

When configured, your meal plan will be automatically pushed to your TRMNL device whenever it changes. You can also manually trigger a push from the web interface.

## Usage

1. Open the web interface at `http://homeassistant.local:3001`
2. Set a start date for your meal plan
3. Add meals - each meal automatically advances to the next day
4. Drag meals between days to reorganize your schedule
5. Delete meals using the delete button
6. Click "Start New Week" to reset and plan a new week

## How It Works

- **Auto-advancing days**: When you add a meal without specifying a day, it's added to the current day and the day counter automatically advances
- **Smart deletion**: When you delete the last meal from a day, subsequent days automatically shift back to keep your plan continuous
- **Persistent storage**: All data is stored in `/data/mealplan.db` and automatically included in Home Assistant backups

## Database & Backups

Your meal plan data is stored in `/data/mealplan.db` and is automatically included in Home Assistant backups. When you restore a backup, your meal plans are restored too.

## Troubleshooting

### "Meal plan not found" Error

The database might not be initialized. Restart the add-on - it will automatically create the required database records.

### Changes Not Persisting

Check the add-on logs to ensure the database is being created at `/data/mealplan.db`. If issues persist, stop the add-on, delete `/data/mealplan.db`, and restart.

### Port Conflict

If port 3001 is already in use, change the port in the add-on configuration and restart.

## Support

For issues or feature requests, visit: https://github.com/jhaals/mealplan/issues
