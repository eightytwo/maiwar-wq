const DATA_URL = "/data/measurements.json";

const LEVELS = {
  '-1': ['url(#b)', '#828282'],
  '1': ['#ccffcc', '#72be72'],
  '41': ['#ffff99', '#b0b027'],
  '201': ['#ffcc99', '#c98038'],
  '501': ['#ff6600', '#b24900'],
};

var measurementData;
var dates;

/**
 * Determine the style information, namely the fill and stroke colour, for a
 * measurement.
 * @param {Number} measurement A value representing a single measurement.
 * @returns {Array} An array containing the fill and stroke colours that represent
 * the measurement.
 */
function styleForMeasurement(measurement) {
  let levels = Object.keys(LEVELS).map((level) => Number(level)).sort()
  let currentLevel = levels[0];

  levels.forEach((level) => {
    if (measurement >= level) {
      currentLevel = level;
    }
  });

  return LEVELS[currentLevel];
}

/**
 * Handle the event when the date being viewed is changed.
 * @param {Number} dateIndex The index of the date selected by the range slider.
 */
function handleDateChanged(dateIndex) {
  const output = document.getElementById('output');

  let currentDate = dates[dateIndex];

  if (output) {
    output.textContent = currentDate;
  }

  let locations = measurementData[currentDate];
  for (nextLocation in locations) {
    let measurement = measurementData[currentDate][nextLocation];
    let measurementStyle = styleForMeasurement(measurement);
    let locationMarker = document.getElementById('location-' + nextLocation);

    locationMarker.style.fill = measurementStyle[0];
    locationMarker.style.stroke = measurementStyle[1];
  }
}

/**
 * Configure the range slider control.
 */
function configureRangeSlider() {
  const maxValue = dates.length - 1;
  const slider = document.getElementById('rangeSlider');
  const output = document.getElementById('output');

  slider.setAttribute('max', maxValue);
  slider.value = maxValue;
  output.textContent = dates.slice(-1)[0];


  $('input[type="range"]').rangeslider({
    polyfill: false,
    onSlide: function(position, value) { handleDateChanged(value) },
  });
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
  measurementData = data;
  dates = Object.keys(this.measurementData).sort();
  configureRangeSlider();
});
