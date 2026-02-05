# MealPrepp - Simple Meal Planning App

A mobile-first meal planning application built with Bun, React, TypeScript, and Tailwind CSS. Plan your meals by day with an intuitive drag-and-drop interface.

## Features

- 🗓️ **Dynamic Day Planning** - Start blank and days are automatically created as you add meals
- 📱 **Mobile-First Design** - Optimized for mobile devices with touch-friendly interface
- ↕️ **Auto-Increment** - Each meal automatically moves to the next day
- 🎯 **Drag & Drop** - Easily move meals between days with touch or mouse
- 💾 **Auto-Save** - All changes automatically saved to localStorage
- ✨ **Clean UI** - Fresh green theme with intuitive design

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed on your system

### Installation

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## How to Use

1. **Pick a Start Date** - Choose when you want to start planning meals
2. **Add Your First Meal** - Enter meal name and optional description
3. **Auto-Increment** - The app automatically moves to the next day for your next meal
4. **Drag to Reorganize** - Long-press (mobile) or click-and-drag (desktop) to move meals between days
5. **Delete Meals** - Tap the trash icon to remove meals

## User Workflow

```
Open app → Pick start date (e.g., Monday)
           ↓
Add "Chicken Salad" → Creates Monday with meal
           ↓
Add "Pasta" → Creates Tuesday with meal
           ↓
Add "Tacos" → Creates Wednesday with meal
           ↓
Drag meals between days to reorganize
           ↓
Changes auto-save to localStorage
```

## Tech Stack

- **Runtime:** Bun
- **Build Tool:** Vite
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS v3
- **Drag & Drop:** @dnd-kit
- **Date Handling:** date-fns
- **State:** React Hooks (useReducer)
- **Persistence:** localStorage

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── AddMealForm.tsx
│   ├── DayColumn.tsx
│   ├── DayItem.tsx
│   ├── DatePicker.tsx
│   ├── MealCard.tsx
│   └── MealList.tsx
├── hooks/
│   └── useMealPlanner.ts  # Core state management
├── types/
│   └── index.ts           # TypeScript interfaces
├── utils/
│   ├── dateHelpers.ts     # Date manipulation
│   └── storage.ts         # localStorage utilities
├── styles/
│   └── globals.css        # Global styles + Tailwind
├── App.tsx                # Main app component
└── main.tsx              # Entry point
```

## Mobile Optimization

- Minimum 44x44px tap targets for touch
- Touch-optimized drag and drop
- Prevents zoom on input focus
- Safe area insets for notched devices
- Responsive layout (mobile-first, desktop-enhanced)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 14+
- Android Chrome 90+

## License

MIT
