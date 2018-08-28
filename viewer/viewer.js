var squares;
var raceLog;
var course;
var visionScreen;

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
  reader.onload =
    ev => {
      var newLog = JSON.parse(ev.target.result);
      if (newLog.filetype != raceLogFileType) {
	alert('The file does not contain SamurAI Jockey race log data');
	return;
      }
      raceLog = newLog;

      course = raceLog.course;
      names = raceLog.names;
      times = raceLog.finished;
      stepLogs = raceLog.log;
      numSteps = stepLogs.length;

      document.getElementById("name0").innerHTML = names[0];
      document.getElementById("name1").innerHTML = names[1];

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
      drawCourse();
      startSound.play();
    };
  reader.readAsText(file);
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
const logoSizes = { platinum: 3.5, gold: 2.8, silver: 2.1, bronze: 1.5 };
const logos = [
  { category: "gold", source: "e-Seikatsu.png" },
  { category: "silver", source: "seizoroi.png" },
  { category: "gold", source: "samurailogo.png" },
  { category: "silver", source: "fukuoka-active.png" },
  { category: "silver", source: "IPSJ-logo.jpg" },
  { category: "bronze", source: "fukuoka-u.jpg" },
];

function logoImageLoaded() {
  const ratio = this.naturalHeight/this.naturalWidth;
  const maxWidth = logoSizes[this.logo.category];
  const logo = this.logo;
  if (ratio * maxWidth > maxLogoHeight) {
    logo.width = maxLogoHeight/ratio;
    logo.height = maxLogoHeight;
  } else {
    logo.width = maxWidth;
    logo.height = ratio * maxWidth;
    const area = logo.width * logo.height;
    const maxArea = maxAreaRatio * maxWidth;
    if (area > maxArea) {
      const shrink = Math.sqrt(maxArea/area);
      logo.width *= shrink;
      logo.height *= shrink;
    }
  }
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

function addKbdControl() {
  document.body.addEventListener('keydown', function(event) {
    if (courseDiv != undefined) {
      var button = 0;
      switch (event.key) {
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
  });
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
  sideBar.style.width = (course.length+1) * unitSize + "px";
  sideBar.style.height = sideBarWidth * unitSize + "px";
  sideBar.style.top = "0px";
  sideBar.style.left = "0px";
  sideBar.style.background = sideBarBackground;
  var remainingWidth = course.length - sideBarSep;
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
  const theOther = sideBar.cloneNode(true);
  sideBar.style.transformOrigin = "0% 0%";
  sideBar.style.transform =
    "rotate(-90deg) " +
    "translate(-" + bottomY(0) + "px,0px)";
  courseDiv.appendChild(sideBar);
  theOther.style.transformOrigin = "0% 0%";
  theOther.style.transform =
    "translate(" + leftX(course.width+sideBarWidth) +
    "px, 0px) rotate(90deg)";
  courseDiv.appendChild(theOther);
}

function drawCourse() {
  if (logoAspectsObtained) {
    drawCourseBody();
  } else {
    obtainLogoAspects(0);
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
    rect.style.background = moveTargetColors[p];
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
      if (sl.before[p] != null) {
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
	  traj.push(buildMoveLine(bx, by, p, ax, ay, true, sl.step));
	  break;
	case "goneoff":
	case "obstacled":
	case "collided": {
	  const fx = bx + before.vx + sl.accel[p].x;
	  const fy = by + before.vy + sl.accel[p].y;
	  traj.push(buildMoveLine(bx, by, p, fx, fy, false, sl.step));
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
  if (currentStep == numSteps) {
    // Race ended: show the result
    for (var p = 0; p != 2; p++) {
      hidePlayerIcon(p);
      document.getElementById("position"+p).innerHTML =
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
    if (b != null) {
      // Player Icon
      placePlayerIcon(b.x, b.y, p, a.x-b.x, a.y-b.y, 0,
		      step.result[p].category);
      document.getElementById("position"+p).innerHTML =
	"@(" + b.x + "," + b.y + ")";
      followerY = Math.min(followerY,b.y);
    } else {
      hidePlayerIcon(p);
      document.getElementById("position"+p).innerHTML =
	"finished in "+times[p].toFixed(2) + " steps";
    }
    switch (step.result[p].category) {
    case "finished":
      playAudio("goal");
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
  setScrollTop(step.visibility,
	       stepLogs[Math.min(numSteps-1, currentStep+1)].visibility,
	       bottomY(followerY));

  // Set the vision screen position
  visionScreen.style.height = topY(step.visibility) + "px";
  visionScreen.style.display = "block";
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
    forward();
    if (currentStep == numSteps) stopPlay();
    currentSubstep = 0;
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
	placePlayerIcon(b.x, b.y, p, dx, dy, progress, step.result[p].category);
	followerY = Math.min(followerY, b.y);
      }
    }
    var substepVis = step.visibility;
    if (currentStep < numSteps-1) {
      substepVis +=
	progress * (stepLogs[currentStep+1].visibility-step.visibility);
    }
    const nextVis = stepLogs[Math.min(numSteps-1, currentStep+1)].visibility;
    const nextNextVis = stepLogs[Math.min(numSteps-1, currentStep+2)].visibility;
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

function startStop(evt) {
  if (raceLog) {
    if (timerPlay === -1) {
      startPlay();
    } else {
      stopPlay();
    }
  }
}

function startPlay() {
  if (currentStep == numSteps) return;
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
