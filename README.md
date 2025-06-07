# Scriptable Scripts

Collection of scripts for the Scriptable app on iOS

## ⏰ Countdown Script

Display a countdown to important dates directly on your iOS home screen via widgets. Perfect for tracking events, deadlines, or upcoming occasions while keeping yourself accountable.

_Based on [jvscholz's countdown widget](https://github.com/jvscholz/website/blob/master/assets/countdown_widget/countdown.js) and updated to work on iPhone 16 Pro and various widget sizes_

**Key Features:**

- 📱 **Responsive design** - Adapts to small, medium, and large widget sizes
- 🧠 **Intelligent grouping** - Automatically switches from days to weeks to months for longer countdowns
- 🎨 **Background customization** - Supports custom images with automatic fallback to solid colors
- ⏱️ **8 PM cutoff feature** - Automatically advances to the next day after 8 PM
- ⚡ **Smart optimization** - Performance-tuned for extended time periods

## 🌱 Habit Tracker

Interactive habit tracking widget that transforms any time period into a visual accountability system. Mark successful days with white dots or failed days with red X symbols through an intuitive popup interface. Features automatic streak calculation, persistent data storage via JSON files, and responsive design that adapts from individual days to weeks/months for longer periods.

**Key Features:**

- ✅ **Interactive toggle** - Tap to mark today as success (dot) or failure (X)
- 🔥 **Streak tracking** - Calculates longest consecutive success streak
- 💾 **Data persistence** - Automatically saves progress to iCloud Documents
- 🎯 **Visual feedback** - Clear dot/X symbols with progress percentages
- 🕛 **Calendar-based tracking** - Days follow natural calendar boundaries (midnight-to-midnight)
- 🧩 **Modular code structure** - Enhanced organization with helper functions and consolidated configuration

**Improvements Over Countdown Script:**

- 🔄 Removed 8 PM cutoff for more accurate day-based tracking
- 🎨 Enhanced dot grid creation with better visual representation
- ⚙️ Consolidated widget configuration for easier customization
- 📊 Consistent progress percentage calculation
- 🛠️ Refactored code with modular helper functions

## 📋 Evolution & Differences

The Habit Tracker evolved from the Countdown Script with significant improvements:

### Countdown Script (Original)

- Designed for one-time events with simple visualization
- Uses 8 PM cutoff logic (days auto-advance after 8 PM)
- Basic visual representation with minimal customization

### Habit Tracker (Enhanced Version)

- Built for recurring habits with interactive tracking
- Uses true calendar days (midnight-to-midnight) for more accurate tracking
- Interactive toggle to mark days as success (dot) or failure (X)
- Persistent data storage with streak calculation
- Improved code organization with modular structure
- Enhanced visual customization and consistent progress calculation

Both scripts support all widget sizes with responsive layouts, but the Habit Tracker offers a more robust solution for tracking regular activities.

## 📲 Installation

**Option A:** Copy and paste scripts directly into the Scriptable app  
**Option B:** Clone this repository and place scripts in your iCloud Drive `scriptable` folder

_For easier editing, open a script from the iCloud drive on a computer_
