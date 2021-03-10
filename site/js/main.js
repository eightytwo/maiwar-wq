const DATA_URL = "data/measurements.json";

const LEVELS = {
  '-1': ['url(#b)', '#828282'],
  '1': ['#ccffcc', '#72be72'],
  '41': ['#ffff99', '#b0b027'],
  '201': ['#ffcc99', '#c98038'],
  '501': ['#ff6600', '#b24900'],
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

var measurementData;
var years = new Set();

/**
 * Display a bar graph showing the history of measurements for a location.
 * @param {locationElement} Element The  fs
 */
function displayLocationHistory(locationElement) {
  const locationGraph = document.getElementById('location-graph');

  locationGraph.querySelectorAll('.location-graph-bar').forEach((bar) => {
    for (nextLocation in measurementData[bar.dataset.date]) {
      if (!locationElement.id.endsWith(nextLocation)) {
        continue;
      }

      let measurement = measurementData[bar.dataset.date][nextLocation];
      let measurementStyle = LEVELS[measurementLevel(measurement)];
      bar.style.backgroundColor = measurementStyle[0];
      bar.style.height = (20 / measurementData[bar.dataset.date][nextLocation] * 100) + 'px';
      break;
    }
  });
}

/**
 * Set up the bar graph that is displayed when a location is selected. The bar
 * graph displays historical water quality measurements for a specific location.
 */
function setupLocationBarGraph() {
  const locationGraph = document.getElementById('location-graph');

  for (nextDate in measurementData) {
    var bar = document.createElement("div");
    bar.classList.add('location-graph-bar')
    bar.dataset.date = nextDate;
    locationGraph.appendChild(bar);
  }

  // Find all locations on the map
  // TODO: change this to find location labels, not the circles
  document.querySelectorAll('circle[id ^= "location-"]').forEach((location) => {
    location.onclick = function (e) {
      const location = e.target;
      const location_rect = location.getBoundingClientRect();
      const x = location_rect.x;
      const y = location_rect.y + location_rect.height;
      locationGraph.classList.remove('invisible');
      locationGraph.style.left = x +  'px';
      locationGraph.style.top = y + 'px';
      displayLocationHistory(e.target);
    };
  });
}

/**
 * Change the content of the sidebar when menu items are clicked.
 * @param {String} targetName The name of the element in the menu that was
 *  clicked.
 */
function menuItemSelected(targetName) {
  // Hide all other sidebar content
  for (element of document.getElementsByClassName('visible')) {
    document.getElementById(element.id).classList.add('hidden');
    document.getElementById(element.id).classList.remove('visible');
  }

  // Show the sidebar content for the selected menu item
  const target = document.getElementById(targetName);
  target.classList.add('visible');
  target.classList.remove('hidden');

  // Update the selected menu item style
  for (element of document.getElementsByClassName('menu-item')) {
    if (element.getAttribute('data-name') == targetName) {
      element.classList.add('menu-item-selected');
    } else {
      element.classList.remove('menu-item-selected');
    }
  }

  return false;
}

/**
 * Determine the level of a measurement.
 * @param {Number} measurement A value representing a single measurement.
 * @returns {Number} A key from the `LEVELS` dictionary representing the level
 * of the measurement.
 */
function measurementLevel(measurement) {
  let levels = Object.keys(LEVELS).map((level) => Number(level)).sort()
  let currentLevel = levels[0];

  levels.forEach((level) => {
    if (measurement >= level) {
      currentLevel = level;
    }
  });

  return currentLevel;
}

/**
 * Handle the event when the date being viewed is changed.
 * @param {String} date The selected date in the format "YYYY-MM".
 */
function handleDateChanged(date) {
  let locations = measurementData[date];
  let [year, month] = date.split('-');
  month = MONTHS[Number(month) - 1];

  // Display the selected month and year
  document.getElementById('current-date').textContent = `${month} ${year}`;

  for (nextLocation in locations) {
    let measurement = measurementData[date][nextLocation];
    let measurementStyle = LEVELS[measurementLevel(measurement)];
    let locationMarker = document.getElementById('location-' + nextLocation);

    locationMarker.style.fill = measurementStyle[0];
    locationMarker.style.stroke = measurementStyle[1];
  }
}

/**
 * Determine the most common measurement level for a given month and year.
 * @param {String} date A date as a string in the format "YYYY-MM".
 * @returns {Number} The measurement level that occurs most frequently for
 * the given date.
 */
function mostCommonLevelForDate(date) {
  // Not all dates have measurements
  if (!(date in measurementData)) {
    return null;
  }

  // Get the measurements for the given date
  const measurements = Object.values(measurementData[date]);

  // Build a dictionary of level number and its frequency
  let frequencies = measurements.reduce((frequencies, measurement) => {
    const level = measurementLevel(measurement);

    if (level != -1) {
      if (level in frequencies) {
        frequencies[level]++;
      } else {
        frequencies[level] = 1;
      }
    }

    return frequencies;
  }, {});

  // Find the measurement level with the highest frequency
  return Object.keys(frequencies).reduce(
    (a, b) => frequencies[a] > frequencies[b] ? a : b
  );
}

/**
 * Create a div (and children) for display measurement levels for a year.
 * @param {String} year The year this div is being created for.
 * @returns {Element} A div.
 */
function createYearChartDiv(year) {
  let yearDiv = document.createElement('div');
  yearDiv.classList.add('chart-year');
  yearDiv.innerText = year;

  let chartDiv = document.createElement('div');
  chartDiv.classList.add('chart')
  yearDiv.appendChild(chartDiv);

  return yearDiv;
}

/**
 * Create the chart that displays the most common measurement levels per year.
 */
function populateChart() {
  years.forEach((year) => {
    let yearDiv = createYearChartDiv(year);

    for (let month = 1; month <= MONTHS.length; month++) {
      let paddedMonth = month <= 9 ? `0${month}` : month;
      let date = `${year}-${paddedMonth}`;

      // Create an individual chart element
      let monthDiv = document.createElement('div');
      monthDiv.id = date;
      monthDiv.classList.add('chart-item');
      yearDiv.firstElementChild.appendChild(monthDiv);

      let mostCommonLevel = mostCommonLevelForDate(date);
      if (mostCommonLevel != null) {
        monthDiv.style.backgroundColor = LEVELS[mostCommonLevel][0];
        monthDiv.style.borderColor = LEVELS[mostCommonLevel][1];
        monthDiv.title = `${MONTHS[month - 1]}`;

        monthDiv.onclick = function (e) {
          handleDateChanged(e.target.id);
        };

        monthDiv.onmouseover = function (e) {
          handleDateChanged(e.target.id);
        };
      } else {
        monthDiv.style.visibility = "hidden";
      }
    }

    document.getElementById('chart').appendChild(yearDiv);
  });
}

/**
 * Reduce the measurement data to measurements per month per year. If a month has
 * more than one measurement the greater measurement is used.
 * @param {Object} data The measurement data keyed by YYYY-MM-DD.
 * @returns {Object} Measurement data keyed by YYYY-MM.
 */
function reduceToMonths(data) {
  let monthlyData = {};

  Object.keys(data).forEach((date) => {
    // From a date string (YYYY-MM-DD) build a key comprised of YYYY-MM
    let dateKey = date.substring(0, date.lastIndexOf("-"));

    if (dateKey in monthlyData) {
      // Measurement data has already been found for this year/month so update
      // the measurements with any values that are greater than those already found.
      for (const [location, measurement] of Object.entries(monthlyData[dateKey])) {
        if (data[date][location] > measurement) {
          monthlyData[dateKey][location] = data[date][location];
        }
      }
    } else {
      monthlyData[dateKey] = data[date];
    }
  });

  return monthlyData;
}

/**
 * Fetch the JSON measurement data.
 * @returns {Object} The measurement data as a JavaScript object.
 */
async function fetchMeasurementDataAsync() {
  let response = await fetch(DATA_URL);

  if (response.ok) {
    return await response.json();
  } else {
    console.log(`Unable to fetch data. Received HTTP status code ${response.status}`);
  }
}

// Kick everything off by fetching the measurement data
fetchMeasurementDataAsync().then(data => {
  // Reduce the measurement data to a single measurement per location per month.
  // For locations with more than one measurement in a month, take the greatest
  // measurement.
  measurementData = reduceToMonths(data);

  const sortedDates = Object.keys(measurementData).sort();

  // Build a set of years for which measurments exist
  sortedDates.forEach((date) => {
    years.add(date.split('-')[0]);
  });

  // Display the summary of the measurements over time
  populateChart();

  // Display the latest measurements on the map
  handleDateChanged(sortedDates[sortedDates.length - 1]);

  // Set up the bar graph that is displayed for a location when selected
  setupLocationBarGraph();
});
