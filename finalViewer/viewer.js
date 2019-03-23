var squares;
var raceLog;
var course;
var visionScreen;
var noVisionScreen = true;
var raceNumber;

var names;
var times;

var currentStep;
var numSteps;
var minY;
var maxY;

var courseDiv;
var unitSize;
var trajectory;
var viewOption = "ahead";
var zoomLevel = 0;

const raceLogFileType = 'race log';

function loadFile(evt) {
  if (evt.target.files.length === 0) return;
  var file = evt.target.files[0];
  var reader = new FileReader();
  reader.onload = ev => viewRace(JSON.parse(ev.target.result));
  reader.readAsText(file);
}

var goalSoundPlayed;

function whichPlayer(p) {
  return (p == 0) == (raceNumber == 0) ? 0 : 1;
}

function viewRace(newLog) {
  if (newLog.filetype != raceLogFileType) {
    alert('The file does not contain SamurAI Jockey race log data');
    return;
  }
  goalSoundPlayed = [false, false];
  raceLog = newLog;
  const colorOf = raceNumber == 0 ? ['red', 'blue'] : ['blue', 'red'];
  document.getElementById("matchTitle").innerHTML =
    "<span style='font-size:40px'><i>" +
    sessionStorage.gameTitle + ":</i></span> " +
    "<span style='color:" + colorOf[whichPlayer(0)] + "'>" +
    raceLog.names[whichPlayer(0)] + "</span> " +
    "<i>vs.</i> " +
    "<span style='color:" + colorOf[whichPlayer(1)] + "'>" +
    raceLog.names[whichPlayer(1)] + "</span>";
  course = raceLog.course;
  names = raceLog.names;
  times = raceLog.finished;
  stepLogs = raceLog.log;
  numSteps = stepLogs.length;

  document.getElementById("name0").innerHTML = names[whichPlayer(0)];
  document.getElementById("name1").innerHTML = names[whichPlayer(1)];

  minY = 0;
  maxY = course.length-1;
  // Determine the y-coordinate range
  stepLogs.forEach(sl => {
    var y0 = sl.after[0] ? sl.after[0].y : 0;
    var y1 = sl.after[1] ? sl.after[1].y : 0;
    minY = Math.min(minY, y0, y1);
    maxY = Math.max(maxY, y0, y1);
  });
  currentStep = 0;
  // Adjust zoomlevel so that at least 20 squares can be seen
  courseDiv = document.getElementById("courseDiv");
  var us = Math.pow(1.1,zoomLevel) * courseDiv.clientWidth/(course.width + 2*sideBarWidth);
  while (courseDiv.clientHeight/us < 20) {
    zoomLevel -= 1;
    us = Math.pow(1.1,zoomLevel) * courseDiv.clientWidth/(course.width + 2*sideBarWidth);
  }
  drawCourse();
}

function bodyResized() {
  if (course) drawCourse();
}

const sideBarWidth = 0.7;
function leftX(x) { return (x+sideBarWidth)*unitSize; }
function topY(y) { return (maxY-y)*unitSize; }
function bottomY(y) { return (maxY-y+1)*unitSize; }

const squareIcons = ["lawn.png", "obstacle.png", "puddle.png"];

// Sponsor logos
const logoSizes = { platinum: 2.8, gold: 2.3, silver: 1.6, bronze: 1.0 };
const logos = [
  { category: "gold", source: "e-Seikatsu.jpg" },
  { category: "gold", source: "hitachi.png" },
  { category: "gold", source: "nomura.png" },
  { category: "gold", source: "samurailogo.png" },
  { category: "silver", source: "seizoroi.png" },
  { category: "silver", source: "IPSJ-logo.jpg" },
  { category: "bronze", source: "jprs.png" },
  { category: "bronze", source: "fujitsu.jpg" },
  { category: "bronze", source: "KCT.png" }
];

function logoImageLoaded() {
  const logo = this.logo;
  const naturalArea = this.naturalHeight * this.naturalWidth;
  const logoArea = logoSizes[this.logo.category];
  var shrink = Math.sqrt(logoArea/naturalArea);
  if (shrink * this.naturalHeight > 1) {
    shrink = 1/this.naturalHeight;
  }
  logo.width = shrink * this.naturalWidth;
  logo.height = shrink * this.naturalHeight;
  obtainLogoAspects(this.number + 1);
}

var logoAspectsObtained = false;

function obtainLogoAspects(n) {
  if (n < logos.length) {
    const img = document.createElement('img');
    img.logo = logos[n];
    img.number = n;
    img.onload = logoImageLoaded;
    img.src = "logos/" + logos[n].source;
  } else {
    logoAspectsObtained = true;
    drawCourseBody();
  }
}

// Course squares 
function buildSquare(x, y) {
  var sqr = document.createElement("img");
  squares[y].push(sqr);
  sqr.src = "icons/" +
    squareIcons[y<0 || course.length <= y ? 0 :
		course.squares[y*course.width + x]];
  sqr.style.width = unitSize + "px";
  sqr.style.height = unitSize + "px";
  sqr.style.border = "1pt solid black";
  sqr.style.position = "absolute";
  sqr.style.top = topY(y) + "px";
  sqr.style.left = leftX(x) + "px";
  sqr.title = "(" + x + "," + y + ")";
  return sqr;
}

function buildLineAcross(y, color) {
  const line = document.createElement("div");
  const thickness = unitSize/10; 
  line.style.position = "absolute";
  line.style.width = (course.width + 2*sideBarWidth)*unitSize + 2 + "px";
  line.style.height = thickness + "px";
  line.style.left = "0px";
  line.style.top = bottomY(y) - thickness/2 - 0.5 * unitSize + "px";
  line.style.background = color;
  line.style.zIndex = 1;
  return line;
}

function zoom(delta) {
  zoomLevel += delta;
  drawCourse();
}

function mouseClicked(event) {
  if (courseDiv != undefined) {
    startStop(event);
  }
}

function keyPressed(event) {
  if (courseDiv != undefined) {
    var button = 0;
    switch (event.key) {
    case "g": case "G":
      button = 'startStop'; break;
    case "r": case "R":
      button = 'rewind'; break;
    case "b": case "B":
      button = 'back'; break;
    case "s": case "S":
      button = 'startStop'; break;
    case "f": case "F":
      button = 'forward'; break;
    case "+":
      button = 'zoomIn'; break;
    case "-":
      button = 'zoomOut'; break;
    case "ArrowUp":
      courseDiv.scrollTop -= unitSize; break;
    case "ArrowDown":
      courseDiv.scrollTop += unitSize; break;
    case "ArrowLeft":
      courseDiv.scrollLeft -= unitSize; break;
    case "ArrowRight":
      courseDiv.scrollLeft += unitSize; break;
    case "v": case "V": {
      const opt = document.getElementById("visionOption");
      const index = opt.selectedIndex;
      const item = opt.options[(index+1)%opt.options.length];
      opt.value = item.value;
      changeViewOption(opt);
      break;
    }
    }
    if (button != 0) {
      document.getElementById(button).click();
    }
  };
}

const maxLogoHeight = 0.8;
const maxAreaRatio = 0.7;
const minSep = 0.1;
const sideBarSep = 0.2;

function drawLogos() {
  if (logos == []) return;	// With no logos to display
  var remaining = logos.slice();
  for (var y = 0; y != course.length; y++) {
    var x = 0;
    while (x < course.width-1) {
      // Find consecutive obstacle squares
      if (course.squares[y*course.width + x] == 1) {
	var w = 1;
	while (x + w != course.width &&
	       course.squares[y*course.width + x + w] == 1) {
	  w++;
	}
	var toDisplay = [];
	var remainingWidth = w;
	while (true) {
	  const width = remaining[0].width;
	  if (remainingWidth < width + 2*minSep) break;
	  remainingWidth -= width;
	  toDisplay.push(remaining.shift());
	  if (remaining.length == 0) remaining = logos.slice();
	}
	if (toDisplay.length != 0) {
	  const sep = remainingWidth/(toDisplay.length+1);
	  var pos = x + sep;
	  toDisplay.forEach(chosen => {
	    const logo = document.createElement("img");
	    logo.style.border = "none";
	    logo.style.background = "white";
	    logo.style.position = "absolute";
	    logo.xpos = pos;
	    logo.ypos = y;
	    logo.width = chosen.width * unitSize;
	    logo.height = chosen.height * unitSize;
	    logo.style.top =
	      topY(y) + (unitSize-logo.height)/2 + "px";
	    logo.style.left = leftX(pos) + "px";
	    logo.src = "logos/" + chosen.source;
	    courseDiv.appendChild(logo);
	    pos += chosen.width + sep;
	  });
	}
	x += w;
      } else {
	x += 1;
      }
    }
  }
}

function drawSideBars() {
  if (logos == []) return;
  const sideBar = document.createElement("div");
  sideBar.style.position = "absolute";
  sideBar.style.width = (course.length+course.vision+1) * unitSize + "px";
  sideBar.style.height = sideBarWidth * unitSize + "px";
  sideBar.style.top = "0px";
  sideBar.style.left = "0px";
  sideBar.style.background = sideBarBackground;
  var remainingWidth = course.length + course.vision - sideBarSep;
  var remaining = logos.slice();
  var toDisplay = [];
  while (true) {
    var w = sideBarWidth * remaining[0].width;
    if (remainingWidth < w + sideBarSep) break;
    toDisplay.push(remaining.shift());
    if (remaining.length == 0) remaining = logos.slice();
    remainingWidth -= w + sideBarSep;
  }
  const sep = sideBarSep + remainingWidth/(toDisplay.length+1);
  var pos = 0.5 + sep;
  toDisplay.forEach(chosen => {
    const img = document.createElement("img");
    img.style.background = "white";
    img.style.position = "absolute"
    img.width = sideBarWidth * chosen.width * unitSize;
    img.style.bottom = 0.1 * unitSize + "px";
    img.style.left = pos * unitSize + "px";
    img.src = "logos/" + chosen.source;
    sideBar.appendChild(img);
    pos += sideBarWidth * chosen.width + sep;
  });
  sideBar.style.transformOrigin = "0% 0%";
  sideBar.style.transform =
    "rotate(-90deg) " +
    "translate(-" + bottomY(0) + "px,0px)";
  courseDiv.appendChild(sideBar);
  const theOther = sideBar.cloneNode(true);
  theOther.style.transformOrigin = "0% 0%";
  theOther.style.transform =
    "translate(" + leftX(course.width+sideBarWidth) +
    "px, " + bottomY(course.length+course.vision+1) + "px) rotate(90deg)";
  courseDiv.appendChild(theOther);
}

function drawCourse() {
  drawProgressBar();
  if (logoAspectsObtained) {
    drawCourseBody();
  } else {
    obtainLogoAspects(0);
  }
}

var progressMarker;
var progressCoef;

function drawProgressBar() {
  const svg = document.getElementById("progressBar");
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  function makeElement(kind) {
    const elem=document.createElementNS("http://www.w3.org/2000/svg", kind);
    svg.appendChild(elem);
    return elem;
  }
  const w = svg.clientWidth;
  const h = svg.clientHeight;
  const bar = makeElement('rect');
  const startAt = 10;
  const endAt = w - 10;
  const barWidth = endAt - startAt;
  bar.setAttribute('x', startAt);
  bar.setAttribute('y', h/4);
  bar.setAttribute('width', barWidth);
  bar.setAttribute('height', h/2);
  bar.setAttribute('fill', "#844");
  progressMarker = makeElement('rect');
  progressMarker.setAttribute('x', startAt);
  progressMarker.setAttribute('y', h/4);
  progressMarker.setAttribute('width', 0);
  progressMarker.setAttribute('height', h/2);
  progressMarker.setAttribute('fill', "#F88");
  progressCoef = barWidth/numSteps;
  if (raceLog.pauses) {
    raceLog.pauses.forEach((pause) => {
      const marker = makeElement('circle');
      marker.setAttribute('cx', startAt + pause*progressCoef);
      marker.setAttribute('cy', h/2);
      marker.setAttribute('r', h/2);
      marker.setAttribute('fill', "#4C8");
    });
  }
}

function drawCourseBody() {
  courseDiv = document.getElementById("courseDiv");
  // Clean up
  while (courseDiv.firstChild) {
    courseDiv.removeChild(courseDiv.firstChild);
  }
  // Always show vertical slider and show horizontal one on need
  courseDiv.style.overflowY = "scroll";
  courseDiv.style.overflowX = zoomLevel > 0 ? "scroll" : "hidden";
  // Decide size
  unitSize = Math.pow(1.1,zoomLevel) *
    courseDiv.clientWidth/(course.width + 2*sideBarWidth);
  // Add margin when needed
  courseDiv.style.marginLeft =
    (zoomLevel >= 0 ? 0 :
     (document.body.clientWidth - course.width * unitSize)/2) + "px";
  // Draw squares
  squares = [];
  for (var y = minY; y <= maxY; y++) {
    squares[y] = [];
    for (var x = 0; x != course.width; x++) {
      courseDiv.appendChild(buildSquare(x, y));
      if (x + 2 < course.width &&
	  course.squares[y*course.width + x] == 1 &&
	  course.squares[y*course.width + x + 1] == 1 &&
	  course.squares[y*course.width + x + 2] == 1) {
      }
    }
  }
  // Logos
  drawLogos();
  // Sidebars
  drawSideBars();
  // Start and goal lines
  courseDiv.appendChild(buildLineAcross(course.length, "green"));
  courseDiv.appendChild(buildLineAcross(0, "red"));
  // Start positions
  for (var p = 0; p != 2; p++) {
    const rect = document.createElement("div");
    rect.style.width = rect.style.height = startRectSize * unitSize + "px";
    rect.style.left =
      leftX(stepLogs[0].before[p].x) + (1-startRectSize)/2*unitSize + "px";
    rect.style.top =
      topY(stepLogs[0].before[p].y) + (1-startRectSize)/2*unitSize + "px";
    const which = (p == 0) == (raceNumber == 0) ? 0 : 1;
    rect.style.background = moveTargetColors[which];
    rect.style.position = "absolute";
    rect.style.zIndex = 2;
    rect.onclick = rewind;
    courseDiv.appendChild(rect);
  }
  // Prepare player icons
  buildPlayerIcons();
  // Prepare trajectories
  trajectory = [];
  stepLogs.forEach(sl => {
    traj = [];
    for (var p = 0; p != 2; p++) {
      const which = (p == 0) == (raceNumber == 0) ? 0 : 1;
      if (sl.before[p] != null && sl.after[p] != null) {
	// Positions before and after the move
	const before = sl.before[p];
	const bx = before.x;
	const by = before.y;
	const after = sl.after[p];
	const ax = after.x;
	const ay = after.y;
	const dx = ax-bx;
	const dy = ay-by;
	// Move Line
	const result = sl.result[p];
	switch (result.category) {
	case "finished":
	case "normal":
	  traj.push(buildMoveLine(bx, by, which, ax, ay, true, sl.step));
	  break;
	case "goneoff":
	case "obstacled":
	case "collided": {
	  const fx = bx + before.vx + sl.accel[p].x;
	  const fy = by + before.vy + sl.accel[p].y;
	  traj.push(buildMoveLine(bx, by, which, fx, fy, false, sl.step));
	  break;
	}
	}
      }
    }
    trajectory.push(traj);
  });
  // Vision Screen
  visionScreen = document.createElement("img");
  visionScreen.id = 'visionScreen';
  courseDiv.appendChild(visionScreen);
  // Show the Current Step
  showStep();
}

var playerIcons;
const playerIconSource = ["player0.png", "player1.png"];
const shadedPlayerIconSource = ["shadedPlayer0.png", "shadedPlayer1.png"];
const playerIconRatio = 0.6;
const playerIconMargin = (1-playerIconRatio)/2;
const moveLineColors = ["#F88", "#88F"];
const moveTargetColors = ["#F44", "#44F"];
const sideBarBackground = "#040";

function buildPlayerIcons() {
  playerIcons = [];
  const size = playerIconRatio * unitSize + "px";
  for (var p = 0; p != 2; p++) {
    const icon = document.createElement("img");
    icon.style.width = icon.style.height = size;
    icon.style.border = "none";
    icon.style.position = "absolute";
    courseDiv.appendChild(icon);
    playerIcons[p] = icon;
  }
}

function placePlayerIcon(x, y, which, dx, dy, progress, result) {
  const icon = playerIcons[which];
  icon.style.top = topY(y+progress*dy) + playerIconMargin*unitSize + "px";
  icon.style.left = leftX(x+progress*dx) + playerIconMargin*unitSize + "px";
  icon.src = "icons/" +
    (result == "normal" || result == "finished" ?
     playerIconSource : shadedPlayerIconSource)[which];
  icon.style.zIndex = 3;
  icon.style.transform =
    result == "normal" || result == "finished" ?
    "rotate(" + (Math.atan2(dx, dy)*180/Math.PI) + "deg)" :
    "rotate(" + progress*360 + "deg)";
  icon.title = "player " + which;
  icon.style.display = "block";
}

function hidePlayerIcon(which) {
  playerIcons[which].style.display = "none";
}

const moveLineWidth = 0.05;
const endPointRadius = 0.15;
const startRectSize = 0.25;

function buildMoveLine(x, y, which, ax, ay, ok, s) {
  // Div for both
  const both = document.createElement("div");
  courseDiv.appendChild(both);
  // Move line
  if (x != ax || y != ay) {
    const line = document.createElement("canvas");
    const top = Math.max(y, ay);
    const left = Math.min(x, ax);
    line.width = (Math.abs(ax-x)+1) * unitSize;
    line.height = (Math.abs(ay-y)+1) * unitSize;
    line.style.position = "absolute";
    line.style.border = "none";
    line.style.top = topY(top) + "px";
    line.style.left = leftX(left) + "px";
    line.style.pointerEvents = "none";
    line.style.zIndex = 1;
    const mctx = line.getContext("2d");
    mctx.scale(unitSize, -unitSize);
    mctx.translate(-left+0.5, -top-0.5)
    mctx.strokeStyle = moveLineColors[which];
    if (!ok) mctx.setLineDash([0.1, 0.1]);
    mctx.lineWidth = moveLineWidth;
    mctx.beginPath();
    mctx.moveTo(x, y);
    mctx.lineTo(ax, ay);
    mctx.stroke();
    both.appendChild(line);
  }
  // End point
  const endPoint = document.createElement("canvas");
  endPoint.width = endPoint.height = unitSize;
  endPoint.style.position = "absolute";
  endPoint.style.top = topY(ay) + "px";
  endPoint.style.left = leftX(ax) + "px";
  // endPoint.style.pointerEvents = "none";
  endPoint.style.zIndex = 2;
  endPoint.onclick = () => {
    currentStep = s;
    showStep();
  };
  const ectx = endPoint.getContext("2d");
  ectx.scale(unitSize, unitSize);
  ectx.beginPath();
  ectx.arc(0.5, 0.5, endPointRadius, 0, 2*Math.PI);
  ectx.fillStyle = moveTargetColors[which];
  ectx.fill();
  both.appendChild(endPoint);
  return both;
}

function showStep() {
  document.getElementById("stepNumber").innerHTML = currentStep;
  progressMarker.setAttribute('width', currentStep*progressCoef);
  if (currentStep == numSteps) {
    // Race ended: show the result
    for (var p = 0; p != 2; p++) {
      hidePlayerIcon(p);
      document.getElementById("position"+whichPlayer(p)).innerHTML =
	"finished in "+times[p].toFixed(2) + " steps";
    }
    // Scroll to the top
    courseDiv.scrollTop = 0;
    // Hide vision screen
    visionScreen.style.display = "none";
    return;
  }
  const step = stepLogs[currentStep];
  var followerY = course.length;
  for (var p = 0; p != 2; p++) {
    // Positions before and after the move
    const b = step.before[p];
    const a = step.after[p];
    if (b != null && a != null) {
      // Player Icon
      placePlayerIcon(b.x, b.y, whichPlayer(p), a.x-b.x, a.y-b.y, 0,
		      step.result[p].category);
      document.getElementById("position"+p).innerHTML =
	"@(" + b.x + "," + b.y + ")";
      followerY = Math.min(followerY,b.y);
    } else {
      hidePlayerIcon(whichPlayer(p));
      document.getElementById("position"+p).innerHTML =
	"finished in "+times[p].toFixed(2) + " steps";
    }
    switch (step.result[p].category) {
    case "finished":
      if (!goalSoundPlayed[p]) {
	playAudio("goal");
	goalSoundPlayed[p] = true;
      }
      break;
    case "goneoff":
      playAudio("goneoff");
      break;
    case "collided":
      playAudio("collision");
      break;
    default:
      if (step.after[p] &&
	  course.squares[step.after[p].y*course.width +
			 step.after[p].x] == 2) {
	// Stepped into a puddle
	playAudio("puddle");
      }
    }
  }
  // Show/unshow trajectory
  for (var s = 0; s <= currentStep; s++) {
    trajectory[s].forEach(t => {
      t.style.display = "block";
    });
  }
  for (var s = currentStep+1; s != numSteps; s++) {
    trajectory[s].forEach(t => {
      t.style.display = "none";
    });
  }
  // Set scroll so that visible squares can be seen
  setScrollTop(step.visibility - 1,
	       stepLogs[Math.min(numSteps-1, currentStep+1)].visibility - 1,
	       bottomY(followerY));

  // Set the vision screen position
  visionScreen.style.height = topY(step.visibility - 1) + "px";
  visionScreen.style.display = noVisionScreen ? "none" : "block";
}

function setScrollTop(vis, ahead, bottom) {
  courseDiv.scrollTop =
    viewOption == "ahead" ? topY(ahead) :
    viewOption == "visible" ? topY(vis) :
    viewOption == "+3" ? topY(vis+3) :
    viewOption == "follower" ? bottom - courseDiv.clientHeight :
    0;
}

function changeViewOption(opt) {
  viewOption = opt.options[opt.selectedIndex].value;
  showStep();
}

function stepForward() {
  if (raceLog) {
    stopPlay();
    forward();
  }
}

var currentSubstep;
function forwardSubstep() {
  if (currentSubstep == numSubsteps) {
    currentSubstep = 0;
    forward();
    if (currentStep == numSteps ||
	(!dontPause && raceLog.pauses && raceLog.pauses.includes(currentStep))) {
      stopPlay();
      if (currentStep == numSteps) endRace();
    }
  } else {
    currentSubstep += 1;
    const step = stepLogs[currentStep];
    const progress = currentSubstep/numSubsteps;
    var followerY = course.length;;
    for (var p = 0; p != 2; p++) {
      const a = step.after[p];
      if (a != null) {
	const b = step.before[p];
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	placePlayerIcon(b.x, b.y, whichPlayer(p), dx, dy, progress, step.result[p].category);
	followerY = Math.min(followerY, b.y);
      }
    }
    var substepVis = step.visibility - 1;
    if (currentStep < numSteps-1) {
      substepVis +=
	progress * (stepLogs[currentStep+1].visibility-step.visibility);
    }
    const nextVis = stepLogs[Math.min(numSteps-1, currentStep+1)].visibility - 1;
    const nextNextVis = stepLogs[Math.min(numSteps-1, currentStep+2)].visibility - 1;
    setScrollTop(substepVis,
		 nextVis + progress * (nextNextVis - nextVis),
		 bottomY(followerY));
    // Set the vision screen position
    visionScreen.style.height = topY(substepVis) + "px";
  }
}

function forward() {
  if (currentStep < numSteps) {
    currentStep += 1;
    showStep();
  } else {
    stopPlay();
    endRace();
  }
}

function stepBackward() {
  if (raceLog && currentStep != 0) {
    currentStep -= 1;
    showStep();
  }
}

var timerPlay = -1;
const initialStepsPerMin = 120;
const speedStride = 8;
var stepsPerMin = initialStepsPerMin;
const framesPerSec = 30;
var numSubsteps;

var startSoundPlayed = false;

var dontPause = false;
function startStop(evt) {
  if (raceLog) {
    dontPause = evt.shiftKey;
    if (timerPlay === -1) {
      if (!startSoundPlayed) {
	startSound.play();
	startSoundPlayed = true;
	var timer = setInterval(function () {
	  if (startSound.currentTime >= startSound.duration - 0.5) {
	    clearInterval(timer);
	    startPlay();
	  }
	},
				200);
      } else {
	startPlay();
      }
    } else {
      stopPlay();
    }
  }
}

function startPlay() {
  if (currentStep == numSteps) return;
  noVisionScreen = false;
  document.getElementById('startStop').innerHTML = "Stop";
  if (currentStep == 0) {
    horseSteps.currentTime = 0;
    bgm.currentTime = 0;
  }
  horseSteps.play();
  bgm.play();
  currentSubstep = 1;
  numSubsteps = Math.max(1, Math.floor(60*framesPerSec/stepsPerMin));
  timerPlay = setInterval(forwardSubstep, 60*1000/stepsPerMin/numSubsteps);
}

function stopPlay() {
  clearTimeout(timerPlay);
  timerPlay = -1;
  dontPause = false;
  horseSteps.pause();
  bgm.pause();
  showStep();
  document.getElementById('startStop').innerHTML = "Start";
}

function rewind() {
  if (raceLog) {
    currentStep = 0;
    stopPlay();
    showStep();
  }
}

function setPlaybackSpeed(v) {
  stepsPerMin =
    speedStride*
    Math.round(Math.pow(4,v/100)*initialStepsPerMin/speedStride);
  document.getElementById("stepsPerMin").innerHTML = stepsPerMin;
  horseSteps.playbackRate = Math.sqrt(stepsPerMin/initialStepsPerMin);
  bgm.playbackRate = Math.sqrt(stepsPerMin/initialStepsPerMin);
  if (timerPlay != -1) {
    stopPlay();
    startPlay();
  }
}

function setDefaultSpeed() {
  document.getElementById("speedSlider").value = 0;
  setPlaybackSpeed(0);
}

const soundLocation = "sound/";

function loadAudio(src, volume, loop) {
  const audio = new Audio();
  const soundType =
	audio.canPlayType("audio/mpeg") == "probably" ||
	audio.canPlayType("audio/mpeg") == "maybe" ? ".mp3" :
	".wav";
  audio.src = soundLocation + src + soundType;
  audio.autoplay = "";
  audio.load();
  audio.volume = volume;
  audio.loop = loop;
  return audio;
}

function playAudio(name, loop) {
  const audio = loadAudio(name, 1, loop);
  audio.play();
}

var bgm = loadAudio("camptown", 1, true);
var horseSteps = loadAudio("horseGalloping", 1, true);
var startSound = loadAudio("horseNeigh", 1);

function startMatch() {
  matchLog = [
    JSON.parse(sessionStorage.raceLog0),
    JSON.parse(sessionStorage.raceLog1)
  ];
  raceNumber = 0;
  viewRace(matchLog[0]);
}

function trim(s) {
  s = s.toString();
  if (s.length <= 8) return s;
  return s.substr(0, 8);
}

function endRace() {
  document.getElementById("resultName0").innerHTML = matchLog[0].names[0];
  document.getElementById("resultName1").innerHTML = matchLog[0].names[1];
  document.getElementById("resultTime00").innerHTML = trim(matchLog[0].finished[0]);
  document.getElementById("resultTime10").innerHTML = trim(matchLog[0].finished[1]);
  var totalTime;
  if (raceNumber == 1) {
    document.getElementById("resultTime01").innerHTML = trim(matchLog[1].finished[1]);
    document.getElementById("resultTime11").innerHTML = trim(matchLog[1].finished[0]);
    totalTime = [
      matchLog[0].finished[0] + matchLog[1].finished[1],
      matchLog[0].finished[1] + matchLog[1].finished[0]
    ];
  } else {
    document.getElementById("resultTime01").innerHTML = "&minus;"
    document.getElementById("resultTime11").innerHTML = "&minus;"
    totalTime = [matchLog[0].finished[0], matchLog[0].finished[1]];
  }
  document.getElementById("resultTotal0").innerHTML = trim(totalTime[0]);
  document.getElementById("resultTotal1").innerHTML = trim(totalTime[1]);
  var cover = document.getElementById('coverall');
  const nextButton = document.getElementById("nextButton");
  nextButton.style.display = "none";
  const againButton = document.getElementById("againButton");
  againButton.style.display = "none";
  cover.style.display = "block";
  var opacity = 0;
  var timer = setInterval(function () {
    if (opacity >= 1){
      clearInterval(timer);
      cover.style.opacity = 1;
      nextButton.innerHTML =
	raceNumber == 0 ? "<i>Next Race</i>" : "<i>Show Tournament Chart</i>";
      nextButton.style.display = "block";
      againButton.style.display = "block";
      courseDiv.style.display = "none";
    }
    opacity += 0.05;
    cover.style.opacity = opacity;
    courseDiv.style.opacity = 1-opacity;
  }, 50);
}

function showTheCourse() {
  courseDiv.style.display = "block";
  var cover = document.getElementById('coverall');
  var opacity = 0;
  var timer = setInterval(function () {
    if (opacity >= 1){
      clearInterval(timer);
      cover.style.display = "none";
    }
    opacity += 0.02;
    cover.style.opacity = 1-opacity;
    courseDiv.style.opacity = opacity;
  }, 20);
}

function showAgain() {
  showTheCourse();
  viewRace(matchLog[raceNumber]);
}

function nextRace() {
  if (raceNumber == 1) {
    sessionStorage.direction = "forward";
    window.history.back();
  }
  showTheCourse();
  raceNumber = 1;
  viewRace(matchLog[1]);
}
