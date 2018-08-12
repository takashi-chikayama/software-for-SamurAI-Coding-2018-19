#include <cstdio>
#include <memory>
#include <thread>
#include <istream>
#include <ostream>
#include <boost/process.hpp>
#include <boost/optional.hpp>

struct RaceCourse;
struct Option {
  std::shared_ptr<std::ofstream> stdinLogStream;
  std::shared_ptr<std::ofstream> stderrLogStream;
  boost::optional<std::vector<std::string>> pauseCommand;
  boost::optional<std::vector<std::string>> resumeCommand;
};

typedef IntVec Velocity;
typedef IntVec Acceleration;

class Logger {
private:
  thread thrd;
  future<void> ftr;
public:
  shared_ptr<mutex> mtx;
  Logger(unique_ptr<istream> input, shared_ptr<ostream> output, int MAX_SIZE);
  ~Logger();
};

enum PlayerStateCategory {
  RACING, ALREADY_FINISHED, ALREADY_DISQUALIFIED
};

struct PlayerState {
  PlayerStateCategory state;
  Position position;
  Velocity velocity;
  int64_t timeLeft;
  PlayerState(PlayerStateCategory s, Position p, Velocity v,
	      int64_t timeLeft):
    state(s), position(p), velocity(v), timeLeft(timeLeft) {}
  PlayerState() {}
};

enum ResultCategory {
  NORMAL, FINISHED,		// Normal run
  GONEOFF, OBSTACLED, COLLIDED,	// Ran but with problem
  NOPLAY,			// Already stopped running
  TIMEDOUT, DIED, INVALID	// Problem in response
};

extern const char *categoryName[];

struct Player {
  // Player AI
  string name;
  boost::process::group group;
  PlayerState state;
  Option option;

  unique_ptr<boost::process::child> child;
  unique_ptr<boost::process::opstream> toAI;
  unique_ptr<boost::process::ipstream> fromAI;
  unique_ptr<Logger> stderrLogger;
  // Player state during a race

  Player() {};
  Player(string command, string name, const RaceCourse &course, int xpos,
	 const Option &opt);
  ResultCategory plan
  (int stepNumber, Player &op, RaceCourse &course, int visiblity,
   Acceleration &accel, int64_t &timeUsed);
  void terminate();
};

