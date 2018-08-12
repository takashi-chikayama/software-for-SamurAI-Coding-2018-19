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
var viewOption = "visible";
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

function leftX(x) { return x*unitSize; }
function topY(y) { return (maxY-y)*unitSize; }
function bottomY(y) { return (maxY-y+1)*unitSize; }

function centerX(x) { return (x+0.5)*unitSize; }
function centerY(y) { return (maxY-y+0.5)*unitSize; }

const squareIcons = ["lawn.png", "obstacle.png", "jump.png"];
const logos = ["IPSJ-logo.jpg", "samurailogo.png", "seizoroi.png"];
var courseHash;

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
  return sqr;
}

function buildLineAcross(y, color) {
  const line = document.createElement("div");
  const thickness = unitSize/10; 
  line.style.position = "absolute";
  line.style.width = course.width*unitSize + 2 + "px";
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

const logoWidth = 3;

function drawLogos() {
  // Find logo positions
  var logoCand = [];
  for (var y = 0; y != course.length; y++) {
    var x = 0;
    while (x < course.width - logoWidth + 1) {
      // Find consecutive obstacle squares
      if (course.squares[y*course.width + x] == 1) {
	var dx = 1;
	while (x + dx != course.width &&
	       course.squares[y*course.width + x + dx] == 1) {
	  dx++;
	}
	const n = Math.floor((dx-1)/logoWidth); // number of logos that fit
	if (n != 0) {
	  const sep = (dx - n * logoWidth)/(n+1);
	  for (var i = 0; i != n; i++) {
	    logoCand.push({ x: x + i * logoWidth + (i+1) * sep, y: y });
	  }
	}
	x += dx;
      } else {
	x++;
      }
    }
  }
  console.log(logoCand);
  // Place logo
  var whichLogo = 0;
  logoCand.forEach(pos => {
    const chosenLogo = logos[whichLogo];
    whichLogo = (whichLogo + 1) % logos.length;
    const logo = document.createElement("img");
    logo.src = "logos/" + chosenLogo;
    logo.style.width = logoWidth*unitSize + "px";
    logo.style.height = 0.8*unitSize + "px";
    logo.style.border = "none";
    logo.style.position = "absolute";
    logo.style.top = topY(pos.y) + 0.1 * unitSize + "px";
    logo.style.left = leftX(pos.x) + "px";
    logo.style.background = "white";
    courseDiv.appendChild(logo);
  });
}

function drawCourse() {
  courseDiv = document.getElementById("courseDiv");
  // Clean up
  while (courseDiv.firstChild) {
    courseDiv.removeChild(courseDiv.firstChild);
  }
  // Always show vertical slider and show horizontal one on need
  courseDiv.style.overflowY = "scroll";
  courseDiv.style.overflowX = zoomLevel > 0 ? "scroll" : "hidden";
  // Decide size
  unitSize = Math.pow(1.1,zoomLevel) * courseDiv.clientWidth/course.width;
  // Add margin when needed
  courseDiv.style.marginLeft =
    (zoomLevel >= 0 ? 0 :
     (document.body.clientWidth - course.width * unitSize)/2) + "px";
  // Draw squares
  squares = [];
  courseHash = 0;
  for (var y = minY; y <= maxY; y++) {
    squares[y] = [];
    for (var x = 0; x != course.width; x++) {
      courseDiv.appendChild(buildSquare(x, y));
      courseHash = 0x3121*courseHash + course.squares[y*course.width + x];
      if (x + 2 < course.width &&
	  course.squares[y*course.width + x] == 1 &&
	  course.squares[y*course.width + x + 1] == 1 &&
	  course.squares[y*course.width + x + 2] == 1) {
      }
    }
  }
  // Logos
  drawLogos();
  // Start and goal lines
  courseDiv.appendChild(buildLineAcross(course.length, "green"));
  courseDiv.appendChild(buildLineAcross(0, "red"));
  // Start positions
  for (var p = 0; p != 2; p++) {
    const rect = document.createElement("div");
    rect.style.width = 0.2 * unitSize + "px";
    rect.style.height = 0.2 * unitSize + "px";
    rect.style.left =
      leftX(stepLogs[0].before[p].x) + 0.4*unitSize + "px";
    rect.style.top =
      topY(stepLogs[0].before[p].y) + 0.4*unitSize + "px";
    rect.style.background = moveTargetColors[p];
    rect.style.position = "absolute";
    courseDiv.appendChild(rect);
  }
  // Prepare player icons
  playerIcons = [];
  for (var p = 0; p != 2; p++) {
    playerIcons[p] = buildPlayerIcon(p);
    courseDiv.appendChild(playerIcons[p]);
  }
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
	  traj.push(buildMoveLine(bx, by, p, ax, ay, true));
	  break;
	case "goneoff":
	case "obstacled":
	case "collided": {
	  const fx = bx + before.vx + sl.accel[p].x;
	  const fy = by + before.vy + sl.accel[p].y;
	  traj.push(buildMoveLine(bx, by, p, fx, fy, false));
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

var playerIcon;
const playerIconSource = ["player0.png", "player1.png"];
const playerIconRatio = 0.6;
const playerIconMargin = (1-playerIconRatio)/2;
const moveLineColors = ["#F88", "#88F"];
const moveTargetColors = ["#F44", "#44F"];

function buildPlayerIcon(which) {
  const icon = document.createElement("img");
  icon.src = "icons/" + playerIconSource[which];
  icon.style.width = playerIconRatio * unitSize + "px";
  icon.style.height = playerIconRatio * unitSize + "px";
  icon.style.border = "none";
  icon.style.position = "absolute";
  return icon;
}

function placePlayerIcon(x, y, which, dx, dy) {
  const icon = playerIcons[which];
  icon.style.top = topY(y) + playerIconMargin*unitSize + "px";
  icon.style.left = leftX(x) + playerIconMargin*unitSize + "px";
  icon.style.zIndex = 2;
  icon.style.transform =
    "rotate(" + (Math.atan2(dx, dy)*180/Math.PI) + "deg)";
  icon.style.display = "block";
}

function hidePlayerIcon(which) {
  playerIcons[which].style.display = "none";
}

function buildMoveLine(x, y, which, ax, ay, ok) {
  // Move line
  const move = document.createElement("canvas");
  const top = Math.max(y, ay);
  const left = Math.min(x, ax);
  move.width = (Math.abs(ax-x)+1) * unitSize;
  move.height = (Math.abs(ay-y)+1) * unitSize;
  move.style.position = "absolute";
  move.style.border = "none";
  move.style.top = topY(top) + "px";
  move.style.left = leftX(left) + "px";
  move.style.zIndex = 1;
  const ctx = move.getContext("2d");
  ctx.scale(unitSize, -unitSize);
  ctx.translate(-left+0.5, -top-0.5)
  ctx.strokeStyle = moveLineColors[which];
  ctx.fillStyle = moveTargetColors[which];
  if (!ok) ctx.setLineDash([0.1, 0.1]);
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  if (ok) {
    ctx.beginPath();
    ctx.arc(ax, ay, 0.1, 0, 2*Math.PI);
    ctx.fill();
  }
  courseDiv.appendChild(move);
  return move;
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
  for (var p = 0; p != 2; p++) {
    // Positions before and after the move
    const b = step.before[p];
    const a = step.after[p];
    if (b != null) {
      // Player Icon
      placePlayerIcon(b.x, b.y, p, a.x-b.x, a.y-b.y);
      document.getElementById("position"+p).innerHTML =
	"@(" + b.x + "," + b.y + ")";
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
	// Jumped into water
	playAudio("water");
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
  courseDiv.scrollTop =
    viewOption == "visible" ? topY(step.visibility) :
    viewOption == "ahead3" ? topY(step.visibility+3) :
    viewOption == "follower" ?
    bottomY(Math.min(step.before[0].y, step.before[1].y)) :
    0;
  // Set the vision screen position
  visionScreen.style.height = topY(step.visibility) + "px";
  visionScreen.style.display = "block";
}

function changeViewOption(opt) {
  viewOption = opt.options[opt.selectedIndex].value;
  showStep();
}

function stepForward() {
  stopPlay();
  forward();
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
  if (currentStep != 0) {
    currentStep -= 1;
    showStep();
  }
}

var timerPlay = -1;
const initialStepsPerMin = 120;
var stepsPerMin = initialStepsPerMin;

function startStop(evt) {
  if (timerPlay === -1) {
    startPlay();
  } else {
    stopPlay();
  }
}

function startPlay() {
  document.getElementById('startStop').innerHTML = "Stop";
  timerPlay = setInterval(forward, 60*1000/stepsPerMin);
  if (currentStep == 0) {
    horseSteps.currentTime = 0;
    bgm.currentTime = 0;
  }
  horseSteps.play();
  bgm.play();
}

function stopPlay() {
  clearTimeout(timerPlay);
  timerPlay = -1;
  horseSteps.pause();
  bgm.pause();
  document.getElementById('startStop').innerHTML = "Start";
}

function rewind() {
  currentStep = 0;
  showStep();
}

function setPlaybackSpeed(s) {
  document.getElementById("stepsPerMin").innerHTML = s;
  stepsPerMin = s;
  horseSteps.playbackRate = Math.sqrt(stepsPerMin/initialStepsPerMin);
  bgm.playbackRate = Math.sqrt(stepsPerMin/initialStepsPerMin);
  if (timerPlay != -1) {
    stopPlay();
    startPlay();
  }
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
