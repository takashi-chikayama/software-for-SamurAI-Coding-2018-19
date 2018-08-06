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
  if (to.x == from.x) {
    addSquares(from.x, from.y, to.y, r);
  } else {
    // Here, we will use the coordinate system where
    // the bottom left corner of the square (x, y) has the coordinates (x, y).
    // Thus, a point (x', y') is in or on a edge of the square (x, y) when
    // x <= x' <= x+1 and y <= y' <= y+1
    double a = (double)(to.y-from.y)/(to.x-from.x);
    int sgnx = from.x < to.x ? 1 : -1;
    // The movement line is on the line given as:
    //    y = a * (x - from.x - 0.5) + from.y + 0.5
    // For the first square
    double y1 = a * sgnx/2.0 + from.y + 0.5;
    int iy1 = to.y > from.y ? floor(y1) : ceil(y1) -1;
    addSquares(from.x, from.y, iy1, r);
    // For squares inbetween
    for (int x = from.x + sgnx; x != to.x; x += sgnx) {
      double y0 = a * (x - from.x - sgnx/2.0) + from.y + 0.5;
      double y1 = a * (x - from.x + sgnx/2.0) + from.y + 0.5;
      int iy0, iy1;
      if (to.y > from.y) {
	iy0 = ceil(y0) - 1;
	iy1 = floor(y1);
      } else {
	iy0 = floor(y0);
	iy1 = ceil(y1) - 1;
      }
      addSquares(x, iy0, iy1, r);
    }
    // For the last square
    double y0 = a * (to.x - from.x - sgnx/2.0) + from.y + 0.5;
    int iy0 = to.y > from.y ? ceil(y0) - 1 : floor(y0);
    addSquares(to.x, iy0, to.y, r);
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
