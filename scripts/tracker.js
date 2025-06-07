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

// calculate actual days since start (for all logic)
const actualDaysSinceStart = Math.floor((NOW - START_DATE) / MS_PER_DAY);

// calculate days left based on actual completed days (to match dot display)
const DAYS_UNTIL_END = Math.max(0, DAYS_TOTAL - actualDaysSinceStart);

// toggle logic should always work on actual calendar day, not adjusted day
const TODAY_INDEX = actualDaysSinceStart - 1;
const todayInRange = TODAY_INDEX >= 0 && TODAY_INDEX < DAYS_TOTAL;
const todayIsX = xDays.includes(TODAY_INDEX);

// ===================================================
// INTERACTIVE TOGGLE LOGIC
// ===================================================

async function handleTodayToggle(todayIndex, isCurrentlyX, xDaysArray) {
  const alert = new Alert();
  alert.title = "toggle today";

  const currentState = isCurrentlyX ? "X" : "dot";
  const toggleTo = isCurrentlyX ? "dot" : "X";

  alert.message = `day ${
    todayIndex + 1
  } is currently: ${currentState}\nwhat would you like to change it to?`;
  alert.addAction(`change to ${toggleTo}`);
  alert.addAction(`keep as ${currentState}`);

  const choice = await alert.present();
  if (choice === 0) {
    if (isCurrentlyX) {
      // remove from x days (change X to dot)
      const index = xDaysArray.indexOf(todayIndex);
      if (index > -1) {
        xDaysArray.splice(index, 1);
      }
    } else {
      // add to x days (change dot to X)
      xDaysArray.push(todayIndex);
    }
    saveTrackerData(xDaysArray);
  }
}

// handle user interaction in app
if (config.runsInApp && todayInRange) {
  await handleTodayToggle(TODAY_INDEX, todayIsX, xDays);
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

// ===================================================
// WIDGET CONFIGURATION AND SIZING
// ===================================================

// widget family and responsive sizing
const widgetFamily = config.widgetFamily || "medium";

// consolidated widget limits configuration
const WIDGET_LIMITS = {
  small: { maxRows: 4, maxCols: 8, width: 158, height: 158 },
  medium: { maxRows: 6, maxCols: 25, width: 338, height: 158 },
  large: { maxRows: 20, maxCols: 25, width: 338, height: 354 },
};

const WIDGET_WIDTH =
  WIDGET_LIMITS[widgetFamily]?.width || WIDGET_LIMITS.medium.width;

// responsive sizing for longer periods
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
  const limits = WIDGET_LIMITS[widgetFamily] || WIDGET_LIMITS.medium;
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

// calculate columns and rows using consolidated configuration
const COLUMNS = Math.floor(
  (WIDGET_WIDTH - 2 * PADDING - DOT_SHIFT_LEFT) /
    (responsiveCircleSize + responsiveSpacing)
);

const ROWS = Math.ceil(grouping.totalDots / COLUMNS);
const maxRows = WIDGET_LIMITS[widgetFamily]?.maxRows || 6;
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

// add overlay
const overlay = new LinearGradient();
overlay.locations = [0, 1];
overlay.colors = [
  new Color(BG_COLOR, BG_OVERLAY_OPACITY),
  new Color(BG_COLOR, BG_OVERLAY_OPACITY),
];
widget.backgroundGradient = overlay;

// set fonts
const MENLO_REGULAR = new Font("Menlo", 12);
const MENLO_BOLD = new Font("Menlo-Bold", 12);

widget.setPadding(12, PADDING, 12, PADDING);

// handle completion case
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

// ===================================================
// DOT GRID CREATION
// ===================================================

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

  // add grouping indicator if showing grouped days
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

  // prepare the grid layout and fonts
  const gridStack = gridContainer.addStack();
  gridStack.layoutVertically();
  gridStack.spacing = responsiveSpacing;

  const dotFont = Font.systemFont(responsiveCircleSize);
  const xFont = Font.systemFont(responsiveCircleSize);

  // helper function to add a symbol to a row
  function addSymbol(row, symbol, font, color) {
    const element = row.addText(symbol);
    element.font = font;
    element.textColor = color;
    return element;
  }

  // helper function to determine dot status for individual days
  function getDotStatusForDay(index) {
    const isXDay = xDaysArray.includes(index);
    const isCompleted = index < completedDays;

    if (isXDay) {
      return { symbol: "✕", color: COLOR_X, font: xFont };
    } else {
      return {
        symbol: "●",
        color: isCompleted ? COLOR_FILLED : COLOR_UNFILLED,
        font: dotFont,
      };
    }
  }

  // helper function to determine dot status for grouped days
  function getDotStatusForGroup(groupIndex) {
    const daysRepresented = (groupIndex + 1) * grouping.daysPerDot;
    const isCompleted =
      completedDays >= daysRepresented - (grouping.daysPerDot - 1);

    // check if any day in the group is marked as X
    const hasXDay = Array.from(
      { length: grouping.daysPerDot },
      (_, i) => groupIndex * grouping.daysPerDot + i
    ).some(
      (dayIndex) => dayIndex < DAYS_TOTAL && xDaysArray.includes(dayIndex)
    );

    if (hasXDay) {
      return { symbol: "✕", color: COLOR_X, font: xFont };
    } else {
      return {
        symbol: "●",
        color: isCompleted ? COLOR_FILLED : COLOR_UNFILLED,
        font: dotFont,
      };
    }
  }

  // create rows and columns
  for (let row = 0; row < rows; row++) {
    const rowStack = gridStack.addStack();
    rowStack.layoutHorizontally();
    rowStack.addSpacer(DOT_SHIFT_LEFT);

    for (let col = 0; col < columns; col++) {
      const dotIndex = row * columns + col;
      if (dotIndex >= grouping.totalDots) continue;

      // get dot status based on whether we're showing individual days or groups
      const dotStatus =
        grouping.daysPerDot === 1
          ? getDotStatusForDay(dotIndex)
          : getDotStatusForGroup(dotIndex);

      addSymbol(rowStack, dotStatus.symbol, dotStatus.font, dotStatus.color);

      // add spacing between columns
      if (col < columns - 1 && dotIndex + 1 < grouping.totalDots) {
        rowStack.addSpacer(responsiveSpacing);
      }
    }
  }
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

// ===================================================
// FOOTER CREATION
// ===================================================

// calculate display text constants
const progressPercentage = Math.round(
  (actualDaysSinceStart / DAYS_TOTAL) * 100
);
const CHAR_WIDTH = 7.5;

// prepare text content
const daysText =
  grouping.daysPerDot === 1
    ? `${DAYS_UNTIL_END} days left (${progressPercentage}%)`
    : `${DAYS_UNTIL_END} days (${Math.ceil(
        DAYS_UNTIL_END / grouping.daysPerDot
      )} ${grouping.unit}s) left`;

const streakText = `longest streak: ${LONGEST_STREAK}`;

// create footer
const footer = widget.addStack();
footer.layoutVertically();
footer.spacing = 4;

if (widgetFamily === "small") {
  // SMALL WIDGET: Vertical stacking
  const eventStack = footer.addStack();
  eventStack.addSpacer(YEAR_OFFSET);
  const eventText = eventStack.addText(EVENT_NAME);
  eventText.font = MENLO_BOLD;
  eventText.textColor = COLOR_FILLED;

  const daysStack = footer.addStack();
  daysStack.addSpacer(YEAR_OFFSET);
  const daysLeftText = daysStack.addText(daysText);
  daysLeftText.font = MENLO_REGULAR;
  daysLeftText.textColor = COLOR_FILLED;

  const streakStack = footer.addStack();
  streakStack.addSpacer(YEAR_OFFSET);
  const streakLabel = streakStack.addText(streakText);
  streakLabel.font = MENLO_REGULAR;
  streakLabel.textColor = COLOR_FILLED;
} else {
  // MEDIUM/LARGE WIDGETS: Horizontal alignment with right-aligned values

  // FIRST ROW: Event name and days left
  const topRow = footer.addStack();
  topRow.layoutHorizontally();

  // event name (left aligned)
  topRow.addSpacer(YEAR_OFFSET);
  const eventText = topRow.addText(EVENT_NAME);
  eventText.font = MENLO_BOLD;
  eventText.textColor = COLOR_FILLED;

  // calculate spacing for right alignment of days text
  const eventTextWidth = EVENT_NAME.length * CHAR_WIDTH;
  const daysTextWidth = daysText.length * CHAR_WIDTH;
  const availableSpace =
    WIDGET_WIDTH - PADDING * 2 - YEAR_OFFSET - eventTextWidth;
  const spacerLength = availableSpace - daysTextWidth;

  topRow.addSpacer(spacerLength);
  const daysLeftText = topRow.addText(daysText);
  daysLeftText.font = MENLO_BOLD;
  daysLeftText.textColor = COLOR_FILLED;

  // Second Row: Streak info (aligned right)
  const bottomRow = footer.addStack();
  bottomRow.layoutHorizontally();

  const totalLeftSpacing = YEAR_OFFSET + eventTextWidth;
  bottomRow.addSpacer(totalLeftSpacing);

  const streakTextWidth = streakText.length * CHAR_WIDTH;
  const streakSpacerLength = availableSpace - streakTextWidth;
  bottomRow.addSpacer(streakSpacerLength);

  const streakLabel = bottomRow.addText(streakText);
  streakLabel.font = MENLO_REGULAR;
  streakLabel.textColor = COLOR_FILLED;
}

// ===================================================
// FINALIZE AND PRESENT THE WIDGET
// ===================================================

Script.setWidget(widget);
Script.complete();
