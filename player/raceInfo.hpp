#include <iostream>
#include <utility>
#include <list>

using namespace std;
using namespace rel_ops;

struct IntVec {
  int x, y;
  IntVec operator+(IntVec &another);
  bool operator==(const IntVec &another) const;
  bool operator<(const IntVec &another) const;
  IntVec(int x = 0, int y = 0): x(x), y(y) {};
};

typedef IntVec Position;
typedef IntVec Velocity;
typedef IntVec Acceleration;

struct RaceCourse {
  uint64_t thinkTime;
  int stepLimit;
  int width, length;
  int vision;
};

extern RaceCourse course;

struct Movement {
  Position from, to;
  bool goesOff(RaceCourse &course);
  list <Position> touchedSquares() const;
  Movement(Position from, Position to): from(from), to(to) {};
};

struct PlayerState {
  Position position;
  Velocity velocity;
  PlayerState();
  PlayerState(Position p, Velocity v);
};

struct RaceInfo {
  int stepNumber;
  uint64_t timeLeft;
  PlayerState me, opponent;
  char **squares;
};

istream &operator>>(istream &in, RaceCourse &course);
istream &operator>>(istream &in, PlayerState &ps);
istream &operator>>(istream &in, RaceInfo &ri);
