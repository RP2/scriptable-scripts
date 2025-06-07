// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: magic;

// ===================================================
// USER CONFIGURATION
// ===================================================

// STEP 1: Enter your event name
const EVENT_NAME = "Month Tracker"; // Change this to your event name

// STEP 2: Set your start and end dates (Format: YYYY, MM-1, DD)
// IMPORTANT: Months are 0-indexed, meaning January=0, February=1, etc.
const START_DATE = new Date(2025, 5, 1); // June 1, 2025
const END_DATE = new Date(2025, 5, 30); // June 30, 2025

// STEP 3: Customize the appearance
const BG_COLOR = "#000";
const BG_OVERLAY_OPACITY = 0.25;
const BG_IMAGE_URL = "image.jpg"; // Optional: filename for background image (leave empty for solid color)

// Color settings for dots
const COLOR_FILLED = new Color("#ffffff");
const COLOR_UNFILLED = new Color("#ffffff", 0.4);
const COLOR_X = new Color("#ff4444"); // color for 'x' days

// STEP 4: Layout settings
const PADDING = 12;
const CIRCLE_SIZE = 8;
const CIRCLE_SPACING = 6;
const TEXT_SPACING = 10;
const DOT_SHIFT_LEFT = 4;
const YEAR_OFFSET = DOT_SHIFT_LEFT - 2;

// ===================================================
// DATA PERSISTENCE
// ===================================================

const fm = FileManager.iCloud();
const dataFile = fm.joinPath(
  fm.documentsDirectory(),
  `tracker_${EVENT_NAME.replace(/\s+/g, "_")}.json`
);

const loadTrackerData = () => {
  if (!fm.fileExists(dataFile)) return [];

  try {
    const data = JSON.parse(fm.readString(dataFile));
    return data.xDays || [];
  } catch (e) {
    console.log("error loading tracker data:", e.message);
    return [];
  }
};

const saveTrackerData = (xDays) => {
  fm.writeString(dataFile, JSON.stringify({ xDays }));
};

// ===================================================
// CORE LOGIC
// ===================================================

function validateConfiguration() {
  if (START_DATE >= END_DATE) {
    throw new Error("Start date must be before end date");
  }

  const daysDiff = Math.round((END_DATE - START_DATE) / 86400000) + 1;
  if (daysDiff <= 0) {
    throw new Error("Invalid date range");
  }

  if (daysDiff > 365) {
    console.warn(
      "Very long countdown period detected. Consider optimizing for performance."
    );
  }

  return daysDiff;
}

const DAYS_TOTAL = validateConfiguration();
const NOW = new Date();
const MS_PER_DAY = 86400000;

// load existing x days data
const xDays = loadTrackerData();

// Calculate actual days since start (for toggle logic)
const actualDaysSinceStart = Math.floor((NOW - START_DATE) / MS_PER_DAY);

// Check if it's after 8 PM, adjust for display purposes only
const CURRENT_HOUR = NOW.getHours();
let adjustedDaysSinceStart = actualDaysSinceStart;
if (CURRENT_HOUR >= 20) {
  adjustedDaysSinceStart += 1;
}

const DAYS_UNTIL_END = Math.max(0, DAYS_TOTAL - adjustedDaysSinceStart);

// Toggle logic should always work on actual calendar day, not adjusted day
const TODAY_INDEX = actualDaysSinceStart - 1;
const todayInRange = TODAY_INDEX >= 0 && TODAY_INDEX < DAYS_TOTAL;
const todayIsX = xDays.includes(TODAY_INDEX);

// allow user to toggle today between x and dot (always show popup when in app)
if (config.runsInApp && todayInRange) {
  const alert = new Alert();
  alert.title = "toggle today";

  const currentState = todayIsX ? "X" : "dot";
  const toggleTo = todayIsX ? "dot" : "X";

  alert.message = `day ${
    TODAY_INDEX + 1
  } is currently: ${currentState}\nwhat would you like to change it to?`;
  alert.addAction(`change to ${toggleTo}`);
  alert.addAction(`keep as ${currentState}`);

  const choice = await alert.present();
  if (choice === 0) {
    if (todayIsX) {
      // remove from x days (change X to dot)
      const index = xDays.indexOf(TODAY_INDEX);
      if (index > -1) {
        xDays.splice(index, 1);
      }
    } else {
      // add to x days (change dot to X)
      xDays.push(TODAY_INDEX);
    }
    saveTrackerData(xDays);
  }
}

// calculate longest streak of dots (broken by x days)
const calculateLongestStreak = (totalDays, xDaysArray, completedDays) => {
  const dayStates = Array.from({ length: totalDays }, (_, i) => ({
    index: i,
    isX: xDaysArray.includes(i),
    isCompleted: i < completedDays,
  }));

  const result = dayStates.reduce(
    (acc, day) => {
      if (day.isX) {
        acc.longestStreak = Math.max(acc.longestStreak, acc.currentStreak);
        acc.currentStreak = 0;
      } else if (day.isCompleted) {
        acc.currentStreak++;
      }
      return acc;
    },
    { longestStreak: 0, currentStreak: 0 }
  );

  // check final streak in case we're currently on the longest streak
  return Math.max(result.longestStreak, result.currentStreak);
};

const LONGEST_STREAK = calculateLongestStreak(
  DAYS_TOTAL,
  xDays,
  actualDaysSinceStart
);

// Widget family and responsive sizing
const widgetFamily = config.widgetFamily || "medium";

function getWidgetDimensions() {
  switch (widgetFamily) {
    case "small":
      return { width: 158, height: 158 };
    case "medium":
      return { width: 338, height: 158 };
    case "large":
      return { width: 338, height: 354 };
    default:
      return { width: 338, height: 158 };
  }
}

const WIDGET_WIDTH = getWidgetDimensions().width;

// Responsive sizing for longer periods
let responsiveCircleSize = CIRCLE_SIZE;
let responsiveSpacing = CIRCLE_SPACING;

if (DAYS_TOTAL > 90) {
  responsiveCircleSize = Math.max(6, CIRCLE_SIZE - 1);
  responsiveSpacing = Math.max(4, CIRCLE_SPACING - 1);
} else if (DAYS_TOTAL > 180) {
  responsiveCircleSize = Math.max(5, CIRCLE_SIZE - 2);
  responsiveSpacing = Math.max(3, CIRCLE_SPACING - 2);
}

function calculateOptimalGrouping(totalDays, widgetFamily) {
  const maxDotsForWidget = {
    small: { maxRows: 4, maxCols: 8 },
    medium: { maxRows: 6, maxCols: 25 },
    large: { maxRows: 20, maxCols: 25 },
  };

  const limits = maxDotsForWidget[widgetFamily] || maxDotsForWidget["medium"];
  const maxDots = limits.maxRows * limits.maxCols;

  if (totalDays <= maxDots) {
    return { daysPerDot: 1, unit: "day", totalDots: totalDays };
  } else if (totalDays / 7 <= maxDots) {
    return {
      daysPerDot: 7,
      unit: "week",
      totalDots: Math.ceil(totalDays / 7),
    };
  } else {
    return {
      daysPerDot: 30,
      unit: "month",
      totalDots: Math.ceil(totalDays / 30),
    };
  }
}

const grouping = calculateOptimalGrouping(DAYS_TOTAL, widgetFamily);

// Calculate columns and rows
const COLUMNS = Math.floor(
  (WIDGET_WIDTH - 2 * PADDING - DOT_SHIFT_LEFT) /
    (responsiveCircleSize + responsiveSpacing)
);

const ROWS = Math.ceil(grouping.totalDots / COLUMNS);

// Apply max row limits - use the same data structure as in calculateOptimalGrouping
const maxDotsForWidget = {
  small: { maxRows: 4, maxCols: 8 },
  medium: { maxRows: 6, maxCols: 25 },
  large: { maxRows: 20, maxCols: 25 },
};

const maxRows = maxDotsForWidget[widgetFamily]?.maxRows || 6;
const finalRows = Math.min(ROWS, maxRows);

// ===================================================
// WIDGET CREATION
// ===================================================

const widget = new ListWidget();

async function setupBackground(widget) {
  if (!BG_IMAGE_URL) {
    widget.backgroundColor = new Color(BG_COLOR);
    return;
  }

  try {
    const fm = FileManager.iCloud();
    const imagePath = fm.joinPath(fm.documentsDirectory(), BG_IMAGE_URL);

    if (fm.fileExists(imagePath)) {
      const bgImage = fm.readImage(imagePath);
      if (bgImage) {
        widget.backgroundImage = bgImage;
        return;
      }
    }
  } catch (e) {
    console.log("Error loading background image:", e.message);
  }

  widget.backgroundColor = new Color(BG_COLOR);
}

await setupBackground(widget);

// Add overlay
const overlay = new LinearGradient();
overlay.locations = [0, 1];
overlay.colors = [
  new Color(BG_COLOR, BG_OVERLAY_OPACITY),
  new Color(BG_COLOR, BG_OVERLAY_OPACITY),
];
widget.backgroundGradient = overlay;

// Set fonts
const MENLO_REGULAR = new Font("Menlo", 12);
const MENLO_BOLD = new Font("Menlo-Bold", 12);

widget.setPadding(12, PADDING, 12, PADDING);

// Handle completion case
if (DAYS_UNTIL_END <= 0) {
  const completedText = widget.addText(`${EVENT_NAME} completed! 🎉`);
  completedText.font = MENLO_BOLD;
  completedText.textColor = COLOR_FILLED;
  completedText.centerAlignText();

  const streakText = widget.addText(`longest streak: ${LONGEST_STREAK} days`);
  streakText.font = MENLO_REGULAR;
  streakText.textColor = COLOR_FILLED;
  streakText.centerAlignText();

  Script.setWidget(widget);
  Script.complete();
  return;
}

function createDotGrid(
  widget,
  rows,
  columns,
  grouping,
  completedDays,
  xDaysArray
) {
  const gridContainer = widget.addStack();
  gridContainer.layoutVertically();

  // add grouping indicator if not showing individual days
  if (grouping.daysPerDot > 1) {
    const indicatorStack = gridContainer.addStack();
    indicatorStack.addSpacer(DOT_SHIFT_LEFT);
    const indicator = indicatorStack.addText(
      `each dot = 1 ${grouping.unit} (red x = missed day)`
    );
    indicator.font = new Font("Menlo", 9);
    indicator.textColor = new Color("#ffffff", 0.7);
    gridContainer.addSpacer(4);
  }

  const gridStack = gridContainer.addStack();
  gridStack.layoutVertically();
  gridStack.spacing = responsiveSpacing;

  const dotFont = Font.systemFont(responsiveCircleSize);
  const xFont = Font.systemFont(responsiveCircleSize);

  // create rows using map for cleaner code
  Array.from({ length: rows }, (_, row) => {
    const rowStack = gridStack.addStack();
    rowStack.layoutHorizontally();
    rowStack.addSpacer(DOT_SHIFT_LEFT);

    // create columns for this row
    Array.from({ length: columns }, (_, col) => {
      const dotIndex = row * columns + col;
      if (dotIndex >= grouping.totalDots) return;

      const addSymbol = (symbol, font, color) => {
        const element = rowStack.addText(symbol);
        element.font = font;
        element.textColor = color;
      };

      // individual days logic
      if (grouping.daysPerDot === 1) {
        const isXDay = xDaysArray.includes(dotIndex);
        const isCompleted = dotIndex < completedDays;

        if (isXDay) {
          addSymbol("✕", xFont, COLOR_X);
        } else {
          addSymbol("●", dotFont, isCompleted ? COLOR_FILLED : COLOR_UNFILLED);
        }
      } else {
        // grouped days logic
        const daysRepresented = (dotIndex + 1) * grouping.daysPerDot;
        const isCompleted =
          completedDays >= daysRepresented - (grouping.daysPerDot - 1);

        // check if any day in this group is an x day
        const hasXDay = Array.from(
          { length: grouping.daysPerDot },
          (_, i) => dotIndex * grouping.daysPerDot + i
        ).some(
          (dayIndex) => dayIndex < DAYS_TOTAL && xDaysArray.includes(dayIndex)
        );

        if (hasXDay) {
          addSymbol("✕", xFont, COLOR_X);
        } else {
          addSymbol("●", dotFont, isCompleted ? COLOR_FILLED : COLOR_UNFILLED);
        }
      }

      // add spacing between columns
      if (col < columns - 1 && dotIndex + 1 < grouping.totalDots) {
        rowStack.addSpacer(responsiveSpacing);
      }
    });
  });
}

createDotGrid(
  widget,
  finalRows,
  COLUMNS,
  grouping,
  actualDaysSinceStart,
  xDays
);

widget.addSpacer(TEXT_SPACING);

// Footer with event name and progress
const footer = widget.addStack();
const progressPercentage = Math.round(
  (adjustedDaysSinceStart / DAYS_TOTAL) * 100
);

if (widgetFamily === "small") {
  footer.layoutVertically();
  footer.spacing = 4;

  // Event name
  const eventStack = footer.addStack();
  eventStack.addSpacer(YEAR_OFFSET);
  const eventText = eventStack.addText(EVENT_NAME);
  eventText.font = MENLO_BOLD;
  eventText.textColor = COLOR_FILLED;

  // Progress info
  const daysStack = footer.addStack();
  daysStack.addSpacer(YEAR_OFFSET);

  const daysText =
    grouping.daysPerDot === 1
      ? `${DAYS_UNTIL_END} days left (${progressPercentage}%)`
      : `${DAYS_UNTIL_END} days (${Math.ceil(
          DAYS_UNTIL_END / grouping.daysPerDot
        )} ${grouping.unit}s) left`;

  const daysLeftText = daysStack.addText(daysText);
  daysLeftText.font = MENLO_REGULAR;
  daysLeftText.textColor = COLOR_FILLED;

  // streak info on separate line
  const streakStack = footer.addStack();
  streakStack.addSpacer(YEAR_OFFSET);
  const streakText = streakStack.addText(`longest streak: ${LONGEST_STREAK}`);
  streakText.font = MENLO_REGULAR;
  streakText.textColor = COLOR_FILLED;
} else {
  footer.layoutVertically();
  footer.spacing = 4;

  // first row with event name and progress
  const topRow = footer.addStack();
  topRow.layoutHorizontally();

  // Event name
  topRow.addSpacer(YEAR_OFFSET);
  const eventText = topRow.addText(EVENT_NAME);
  eventText.font = MENLO_BOLD;
  eventText.textColor = COLOR_FILLED;

  // Progress info
  const daysText = `${DAYS_UNTIL_END} days left (${progressPercentage}%)`;

  const CHAR_WIDTH = 7.5;
  const eventTextWidth = EVENT_NAME.length * CHAR_WIDTH;
  const daysTextWidth = daysText.length * CHAR_WIDTH;
  const availableSpace =
    WIDGET_WIDTH - PADDING * 2 - YEAR_OFFSET - eventTextWidth;
  const spacerLength = availableSpace - daysTextWidth;

  topRow.addSpacer(spacerLength);

  const daysLeftText = topRow.addText(daysText);
  daysLeftText.font = MENLO_BOLD;
  daysLeftText.textColor = COLOR_FILLED; // second row with streak info (aligned right like the progress)
  const bottomRow = footer.addStack();
  bottomRow.layoutHorizontally();

  // Calculate total left spacing to match the progress line exactly
  const totalLeftSpacing = YEAR_OFFSET + eventTextWidth;
  bottomRow.addSpacer(totalLeftSpacing);

  // Calculate spacing to align streak to the right
  const streakText = `longest streak: ${LONGEST_STREAK}`;
  const streakTextWidth = streakText.length * CHAR_WIDTH;
  const streakSpacerLength = availableSpace - streakTextWidth;

  bottomRow.addSpacer(streakSpacerLength);

  const streakLabel = bottomRow.addText(streakText);
  streakLabel.font = MENLO_REGULAR;
  streakLabel.textColor = COLOR_FILLED;
}

Script.setWidget(widget);
Script.complete();
