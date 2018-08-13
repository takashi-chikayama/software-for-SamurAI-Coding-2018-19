#include <algorithm>
#include <queue>
#include <map>
#include <cctype>
#include "raceInfo.hpp"

#ifndef SEARCHDEPTH
#define SEARCHDEPTH 7
#endif

#ifndef SPEEDLIMIT
#define SPEEDLIMIT 1000
#endif

const int searchDepth = SEARCHDEPTH;
const int speedLimitSquared = SPEEDLIMIT*SPEEDLIMIT;

bool operator<(const PlayerState &ps1, const PlayerState &ps2) {
  return
    ps1.position == ps2.position ?
    ps1.velocity < ps2.velocity :
    ps1.position < ps2.position;
}

bool operator==(const PlayerState &ps1, const PlayerState &ps2) {
  return
    ps1.position == ps2.position &&
    ps1.velocity == ps2.velocity;
}

int nextSeq = 1;

struct Candidate {
  int seq;
  int step;			// Steps needed to come here
  PlayerState state;		// State of the player
  Candidate *from;		// Came here from this place
  Acceleration how;		//   with this acceleration
  bool goaled;
  double goalTime;		// Goal time, if goaled
  Candidate(int t, PlayerState s, Candidate *f, Acceleration a):
    seq(nextSeq++), step(t), state(s), from(f), how(a) {
    goaled = state.position.y >= course.length;
    if (goaled) {
      goalTime = step +
	(course.length - state.position.y - 0.5)/state.velocity.y;
    }
  }
  bool operator<(const Candidate &c) const {
    return
      c.goaled ? !goaled || goalTime >= c.goalTime :
      state == c.state ? step > c.step :
      state < c.state;
  }
};
  
ostream &operator<<(ostream &out, Candidate c) {
  out << "#" << c.seq << ": "
      << c.step
      << "@(" << c.state.position.x << "," << c.state.position.y << ")+("
      << c.state.velocity.x << "," << c.state.velocity.y << ")"
      << " <- #" << (c.from == nullptr ? 0 : c.from->seq);
  return out;
}

Acceleration plan(RaceInfo &info, const RaceCourse &course) {
  priority_queue <Candidate *> candidates;
  map <PlayerState, Candidate *> reached;
  PlayerState initial(info.me.position, info.me.velocity);
  Candidate initialCand(0, initial, nullptr, Acceleration(0, 0));
  reached[initial] = &initialCand;
  Candidate *best = &initialCand;
  candidates.push(&initialCand);
  do {
    Candidate *c = candidates.top();
    candidates.pop();
    for (int cay = 1; cay != -2; cay--) { // Try going forward first
      for (int cax = -1; cax != 2; cax++) {
	Acceleration accel(cax, cay);
	Velocity velo = c->state.velocity + accel;
	if (velo.x * velo.x + velo.y * velo.y <= speedLimitSquared) {
	  Position pos = c->state.position + velo;
	  if (0 <= pos.x && pos.x < course.width) {
	    Movement move(c->state.position, pos);
	    list <Position> touched = move.touchedSquares();
	    if (pos != info.opponent.position &&
		none_of(touched.begin(), touched.end(),
			[info, course](Position s) {
			  return
			    0 <= s.y &&
			    s.y < course.length &&
				  info.squares[s.y][s.x] == 1;
			})) {
	      if (0 <= pos.y && pos.y < course.length &&
		  info.squares[pos.y][pos.x] == 2) {
		// Jumped into water
		velo = Velocity(0, 0);
	      }
	      PlayerState nextState(pos, velo);
	      Candidate *nextCand =
		new Candidate(c->step+1, nextState, c, Acceleration(cax, cay));
	      if (!nextCand->goaled &&
		  c->step < searchDepth &&
		  (reached.count(nextState) == 0 ||
		   reached[nextState]->step > c->step+1)) {
		candidates.push(nextCand);
		reached[nextState] = nextCand;
	      }
	      if (*nextCand > *best) {
		best = nextCand;
	      }
	    }
	  }
	}
      }
    }
  } while (!candidates.empty());
  if (best == &initialCand) {
    // No good move found
    // Slowing down for a while might be a good strategy
    int ax = 0, ay = 0;
    if (info.me.velocity.x < 0) ax += 1;
    else if (info.me.velocity.x > 0) ax -= 1;
    if (info.me.velocity.y < 0) ay += 1;
    else if (info.me.velocity.y > 0) ay -= 1;
    return Acceleration(ax, ay);
  }
  Candidate *c = best;
  while (c->from != &initialCand) {
    c = c->from;
  }
  return c->how;
}

ostream &operator<<(ostream &out, const IntVec &v) {
  out << "(" << v.x << "," << v.y << ")";
  return out;
}

int main(int, char *[]) {
  cin >> course;
  cout << "0" << endl;
  cout.flush();
  while (!cin.eof()) {
    RaceInfo info;
    cin >> info;
    IntVec accel = plan(info, course);
    cout << accel.x << ' ' << accel.y << endl;
    cout.flush();
    while (isspace(cin.peek())) cin.ignore(1);
  }
}
