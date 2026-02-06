# Installation Guide

## For Home Assistant Users

### Add the Repository

1. Navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click the three-dot menu in the top right
3. Select **Repositories**
4. Add this URL: `https://github.com/jhaals/mealplan`
5. Click **Add**

### Install the Add-on

1. The MealPlan add-on should now appear in the add-on store
2. Click on **MealPlan**
3. Click **Install**
4. Wait for installation to complete

### Configure (Optional)

The add-on works with default settings, but you can customize the port:

```yaml
port: 3001  # Change if port 3001 is already in use
```

### Start the Add-on

1. Click **Start**
2. Wait for the add-on to initialize (this may take a minute on first start)
3. Check the **Log** tab to verify startup was successful

### Access the Web Interface

Open your browser and navigate to:
```
http://homeassistant.local:3001
```

Or if you changed the port:
```
http://homeassistant.local:YOUR_PORT
```

## Local Development Testing

### Build the Docker Image

```bash
docker build -f addon/Dockerfile -t mealplan-test .
```

### Run Locally

```bash
# Create test data directory
mkdir -p test-data
echo '{"port": 3001}' > test-data/options.json

# Run container
docker run --rm -p 3001:3001 -v $(pwd)/test-data:/data mealplan-test
```

### Access Locally

Open browser to: `http://localhost:3001`

## Troubleshooting

### Add-on Won't Start

Check the logs in Home Assistant. Common issues:

1. **Port conflict**: Change the port in add-on configuration
2. **Missing database**: The add-on creates this automatically on first start
3. **Migration errors**: Stop the add-on, restart it, and check logs again

### Database Issues

The database is stored at `/data/mealplan.db` inside the add-on. This location is automatically backed up by Home Assistant.

To reset the database:
1. Stop the add-on
2. Delete `/data/mealplan.db` via SSH or File Editor
3. Restart the add-on

### Web Interface Not Loading

1. Verify the add-on is running (check the **Info** tab)
2. Check the port configuration
3. Try accessing via IP address instead of hostname: `http://[HA_IP]:3001`

## Backup and Restore

Your meal plan data is automatically included in Home Assistant backups. When you restore a backup, your meal plans are restored automatically.

## Updates

When a new version is released:

1. Go to the MealPlan add-on page
2. Click **Update** if available
3. Your data in `/data/mealplan.db` will be preserved

## Support

For issues or feature requests, visit: https://github.com/jhaals/mealplan/issues
