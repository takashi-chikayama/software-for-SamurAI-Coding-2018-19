#include <cmath>
#include "raceInfo.hpp"

IntVec IntVec::operator+(IntVec &another) {
  return IntVec(x + another.x, y + another.y);
}

bool IntVec::operator==(const IntVec &another) const {
  return x == another.x && y == another.y;
}

bool IntVec::operator<(const IntVec &another) const {
  return y == another.y ?	// If y position is the same
    x > another.x :		// better to be more to the left
    y < another.y;
}

RaceCourse course;

PlayerState::PlayerState() {}
PlayerState::PlayerState(Position p, Velocity v):
  position(p), velocity(v) {}

void addSquares(int x, int y0, int y1, list <Position> &squares) {
  if (y1 > y0) {
    for (int y = y0; y <= y1; y++) {
      squares.emplace_back(x, y);
    }
  } else {
    for (int y = y0; y >= y1; y--) {
      squares.emplace_back(x, y);
    }
  }
}

list <Position> Movement::touchedSquares() const {
  list <Position> r;
  int dx = to.x - from.x;
  int dy = to.y - from.y;
  int sgnx = dx > 0 ? 1 : -1;
  int sgny = dy > 0 ? 1 : -1;
  if (dx == 0) {
    for (int k = 0, y = from.y; k <= dy; k++, y += sgny) {
      r.emplace_back(from.x, y);
    }
  } else if (dy == 0) {
    for (int k = 0, x = from.x; k <= dx; k++, x += sgnx) {
      r.emplace_back(x, from.y);
    }
  } else {
    // Let us transform the move line so that it goes up and to the right,
    // that is, with dx > 0 and dy > 0.
    // The results will be adjusted afterwards.
    if (sgnx < 0) dx = -dx;
    if (sgny < 0) dy = -dy;
    // We will use the coordinate system in which the start point
    // of the move is at (0,0) and x-coodinate values are doubled,
    // so that x is integral on square borders.
    // The point (X,Y) in the original coordinate system becomes
    //   x = 2*(X-from.x)
    //   y = Y-from.y
    // Such a movement line satisfies the following.
    //   y = dy/dx/2 * x, or 2*dx*y = dy*x
    //
    // The start square and those directly above it
    for (int y = 0; dx*(2*y-1) <= dy; y++) {
      r.emplace_back(0, y);
    }
    // The remaining squares except for those below (dx, dy)
    for (int x = 1; x < 2*dx-1; x += 2) {
      for (int y = (dy*x+dx)/(2*dx) -
	     (dy*x+dx == (dy*x+dx)/(2*dx)*(2*dx) ? 1 : 0);
	   dx*(2*y-1) <= dy*(x+2);
	   y++) {
	r.emplace_back((x+1)/2, y);
      }
    }
    // For the final squares with x = dx
    for (int y = (dy*(2*dx-1)+dx)/(2*dx) -
	   ((dy*(2*dx-1)+dx) == (dy*(2*dx-1)+dx)/(2*dx)*(2*dx) ? 1 : 0);
	 y <= dy;
	 y++) {
      r.emplace_back(dx, y);
    }
    // Adjustment
    for (auto &p: r) {
      if (sgnx < 0) p.x = -p.x;
      if (sgny < 0) p.y = -p.y;
      p.x += from.x;
      p.y += from.y;
    }
  }
  return r;
}

istream &operator>>(istream &in, RaceCourse &course) {
  in >> course.thinkTime
     >> course.stepLimit
     >> course.width >> course.length
     >> course.vision;
  return in;
}

istream &operator>>(istream &in, PlayerState &ps) {
  in >> ps.position.x
     >> ps.position.y
     >> ps.velocity.x
     >> ps.velocity.y;
  return in;
};

istream &operator>>(istream &in, RaceInfo &ri) {
  in >> ri.stepNumber
     >> ri.timeLeft
     >> ri.me
     >> ri.opponent;
  ri.squares = new char*[course.length];
  for (int y = 0; y != course.length; y++) {
    ri.squares[y] = new char[course.width];
    for (int x = 0; x != course.width; x++) {
      int state;
      in >> state;
      ri.squares[y][x] = state;
    }
  }
  return in;
}
