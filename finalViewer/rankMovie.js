var tintTimer;
var styleElem;
var style = document.createElement('style');
document.head.appendChild(style);

var moviePhase = 0;
var movieInterval = 30;
var rowShowInterval = 100;
var movieSteps = 10;
var currentStep;
var movieSetInterval;
var rowsShown;
var collapsedIndex;

function movieStep() {
  currentStep = 0;
  switch (moviePhase) {
  case 0:
    rowsShown = 0;
    movieSetInterval = setInterval(() => showRows(), rowShowInterval);
    break;
  case 1:
    movieSetInterval = setInterval(() => top8(), movieInterval);
    break;
  case 2:
    collapsedIndex = 8;
    movieSetInterval = setInterval(() => collapse(), rowShowInterval);
    break;
  }
  moviePhase += 1;
}

const rowTable = [];

function makeRowTable() {
  const rows = document.querySelectorAll("tbody tr");
  for (var k = 0; k != rows.length; k++) {
    rowTable[k] = rows[k];
  }
}

function showRows() {
  rowTable[rowTable.length - rowsShown - 1].style.display = "table-row";
  rowsShown += 1;
  if (rowsShown == rowTable.length) clearInterval(movieSetInterval);
}

function top8() {
  const styleElem = document.createElement('style');
  const gb = 63*(movieInterval-currentStep)/movieInterval + 192;
  styleElem.innerHTML =
    ".top8 { background: rgb(255," + gb + "," + gb + "); }";
  style.appendChild(styleElem);
  if (currentStep == movieInterval) clearInterval(movieSetInterval);
  currentStep++;
}

function collapse() {
  const row = rowTable[collapsedIndex];
  if (!row.classList.contains("keep")) {
    row.style.display = "none";
  }
  collapsedIndex += 1;
  if (collapsedIndex == rowTable.length) clearInterval(movieSetInterval);
}

