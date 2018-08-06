#include <list>
#include <cstdio>
#include <memory>
#include <fstream>

#include <boost/optional.hpp>

#include "course.hpp"
#include "player.hpp"

struct StepResult {
  ResultCategory category;
  double x, y;
};

struct StepLog {
  int stepNumber;
  int visibility;
  PlayerState before[2];
  Acceleration acceleration[2];
  StepResult result[2];
  PlayerState after[2];
};

struct Option;

struct RaceState {
  RaceCourse *course;
  Player players[2];
  int visibility;
  RaceState(RaceCourse &course,
	    string &player0, string &name0, string &player1, string &name1,
	    const std::array<Option, 2>& options);
};

struct RaceLog {
  const RaceCourse *course;
  string names[2];
  double goalTime[2];
  list<StepLog> log;
  RaceLog(const RaceCourse &course, string &name0, string &name1);
  bool playOneStep(int c, RaceState &raceState);
};

extern const char* RaceLogFileType;

ostream &operator<<(ostream &out, const PlayerState &state);
ostream &operator<<(ostream &out, const StepResult &res);
ostream &operator<<(ostream &out, const StepLog &log);
ostream &operator<<(ostream &out, const RaceLog &log);
