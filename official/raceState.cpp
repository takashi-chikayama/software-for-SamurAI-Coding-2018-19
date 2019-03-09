#include "raceState.hpp"
#include <cmath>
#include <cfloat>

const char* RaceLogFileType =  "race log";

RaceState::RaceState
(RaceCourse &course,
 string &player0, string &name0, string &player1, string &name1,
 const std::array<Option, 2>& options):
  course(&course),
  players{
  Player(player0, name0, course, course.startX[0], options[0]),
    Player(player1, name1, course, course.startX[1], options[1])},
  visibility(course.vision) {

  }

RaceLog::RaceLog(const RaceCourse &course, string &name0, string &name1):
  course(&course),
  names{name0, name1},
  goalTime { 2.0*course.stepLimit, 2.0*course.stepLimit} {
}

bool RaceLog::playOneStep
(int stepNumber, RaceState &rs) {
  Position nextPosition[2];
  Velocity nextVelocity[2];
  Acceleration acceleration[2];
  Movement move[2];
  ResultCategory playResult[2];
  int64_t timeUsed[2];
  list <Position> touched[2];
  for (int p = 0; p != 2; p++) {
    PlayerState &ps = rs.players[p].state;
    // Initialize Log
    if (ps.state == RACING) {
      playResult[p] =
	rs.players[p].plan(stepNumber, rs.players[1-p],
			   *rs.course, rs.visibility,
			   acceleration[p], timeUsed[p]);
      switch (playResult[p]) {
      case TIMEDOUT:
      case INVALID:
      case DIED:
	nextVelocity[p] = Velocity(0, 0);
	acceleration[p] = Acceleration(0, 0);
	nextPosition[p] = Position(0, 0);
	break;
      case NORMAL:
	nextVelocity[p] = ps.velocity + acceleration[p];
	nextPosition[p] = ps.position + nextVelocity[p];
	move[p] = Movement(ps.position, nextPosition[p]);
	if (nextPosition[p].x < 0 || course->width <= nextPosition[p].x) {
	  playResult[p] = GONEOFF;
	  move[p] = Movement(ps.position, ps.position);
	} else {
	  touched[p] = move[p].touchedSquares();
	  if (any_of(touched[p].begin(), touched[p].end(),
		     [this](Position s) {
		       return
			 0 <= s.y && s.y < course->length &&
			 course->squares[s.y][s.x] == 1;
		     })) {
	    playResult[p] = GONEOFF;
	    move[p] = Movement(ps.position, ps.position);
	  }
	}
	break;
      default:
	cerr << "Unexpected result of player's plan" << endl;
	exit(1);
      }
    } else {
      playResult[p] = NOPLAY;
    }
  }
  if (playResult[0] == NORMAL || playResult[1] == NORMAL) {
    // Check collision
    bool collision = move[0].intersects(move[1]);
    if (collision) {
      bool noprio[2] = { false, false };
      for (int p = 0; p != 2; p++) {
	noprio[p] =
	  any_of(touched[p].begin(), touched[p].end(),
		 [p, &rs](Position &sqr) {
		   return rs.players[1-p].state.position == sqr;
		 });
      }
      if (!noprio[0] && !noprio[1]) {
	PlayerState
	  &ps0 = rs.players[0].state,
	  &ps1 = rs.players[1].state;
	noprio[1] =
	  (ps0.position.y < ps1.position.y) ||
	  ((ps0.position.y == ps1.position.y) &&
	   ps0.position.x < ps1.position.x);
	noprio[0] = !noprio[1];
      }
      for (int p = 0; p != 2; p++) {
	if (noprio[p]) {
	  playResult[p] = COLLIDED;
	  nextVelocity[p] = Velocity(0, 0);
	  nextPosition[p] = rs.players[p].state.position;
	}
      }
    }
  }
  StepLog stepLog;
  stepLog.stepNumber = stepNumber;
  stepLog.visibility = rs.visibility;
  for (int p = 0; p != 2; p++) {
    PlayerState &ps = rs.players[p].state;
    stepLog.before[p] = ps;
    stepLog.acceleration[p] = acceleration[p];
    if (playResult[p] == NOPLAY) {
      stepLog.after[p] = stepLog.before[p];
    } else {
      if (playResult[p] > NOPLAY) {
	ps.state = ALREADY_DISQUALIFIED;
      } else if (playResult[p] == GONEOFF) {
	// Gone off the course
	nextPosition[p] = ps.position;
	nextVelocity[p] = Velocity(0, 0);
      } else if (nextPosition[p].y >= rs.course->length) {
	playResult[p] = FINISHED;
	goalTime[p] =
	  stepNumber - 1 +
	  (double)(rs.course->length - ps.position.y)/nextVelocity[p].y;
      } else if (0 <= nextPosition[p].y &&
		 nextPosition[p].y < rs.course->length &&
		 course->squares[nextPosition[p].y][nextPosition[p].x] == 2) {
	// Jumped into water
	nextVelocity[p] = Velocity(0, 0);
      }
      ps.position = nextPosition[p];
      rs.visibility =
	max(rs.visibility, ps.position.y + rs.course->vision);
      ps.velocity = nextVelocity[p];
      // ps.timeLeft -= timeUsed[p];
      stepLog.after[p] = ps;
      stepLog.result[p].category = playResult[p];
      if (playResult[p] == FINISHED) {
	ps.state = ALREADY_FINISHED;
      }
    }
  }
  log.push_back(stepLog);
  return
    rs.players[0].state.state != RACING &&
    rs.players[1].state.state != RACING;
}

ostream &operator<<(ostream &out, const PlayerState &s) {
  if (s.state == RACING) {
    out << "{ \"x\": " << s.position.x << ", \"y\": " << s.position.y
	<< ", \"vx\": " << s.velocity.x << ", \"vy\": " << s.velocity.y
	<< ", \"timeLeft\": " << s.timeLeft << " }";
  } else {
    out << "null";
  }
  return out;
}

ostream &operator<<(ostream &out, const StepResult &res) {
  if (res.category == NOPLAY) {
    out << "null";
  } else {
    out << "{ \"category\": \"" << categoryName[res.category]
	<< "\", \"info\": ";
    if (res.category == OBSTACLED || res.category == COLLIDED) {
      out << "{ \"x\": " << res.x << ", \"y\": " << res.y << " }";
    } else {
      out << "null";
    }
    out << "}";
  }
  return out;
}

ostream &operator<<(ostream &out, const StepLog &log) {
  out << "{" << endl
      << "  \"step\": " << log.stepNumber<< "," << endl
      << "  \"visibility\": " << log.visibility << "," << endl
      << "  \"before\": [" << endl
      << "    " << log.before[0] << "," << endl
      << "    " << log.before[1] << "]," << endl
      << "  \"accel\": [";
  for (int p = 0; p != 2; p++) {
    if (log.result[p].category >= NOPLAY) {
      out << "null";
    } else {
      out << log.acceleration[p];
    }
    if (p == 0) out << ",";
  }
  out << "  ]," << endl
      << "  \"result\": [" << endl
      << "    " << log.result[0] << "," << endl
      << "    " << log.result[1] << "]," << endl
      << "  \"after\": [" << endl
      << "    " << log.after[0] << "," << endl
      << "    " << log.after[1] << "]" << endl
      << "}";
  return out;
}

double inftomax (double x) {
  return (std::isinf(x) ? (x>0? DBL_MAX : -DBL_MAX) : x);
}

ostream &operator<<(ostream &out, const RaceLog &log) {
  out << "{" << endl
      << "  \"filetype\": \"" << RaceLogFileType << "\"," << endl
      << "  \"course\": " << endl << *log.course << "," << endl
      << "  \"names\": [\""
      << log.names[0] << "\", \"" << log.names[1] << "\"]," << endl
      << "  \"finished\": ["
      << inftomax(log.goalTime[0]) << ", " << inftomax(log.goalTime[1]) << "]," << endl
      << "  \"log\": [" << endl;
  for (auto sl = log.log.begin(); sl != log.log.end(); sl++) {
    out << *sl;
    if (next(sl) != log.log.end()) out << ",";
  }
  out << endl
      << "  ]" << endl
      << "}" << endl;
  return out;
}
