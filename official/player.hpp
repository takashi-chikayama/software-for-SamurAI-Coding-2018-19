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
  std::thread thread;
  std::future<void> future;
public:
  std::shared_ptr<std::mutex> mutex;
  Logger(std::unique_ptr<std::istream> input, std::shared_ptr<std::ostream> output, int MAX_SIZE);
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

  std::unique_ptr<boost::process::child> child;
  std::unique_ptr<boost::process::opstream> toAI;
  std::unique_ptr<boost::process::ipstream> fromAI;
  std::unique_ptr<Logger> stderrLogger;
  // Player state during a race

  Player() {};
  Player(string command, string name, const RaceCourse &course, int xpos,
	 const Option &opt);
  ResultCategory plan
  (int stepNumber, Player &op, RaceCourse &course, int visiblity,
   Acceleration &accel, int64_t &timeUsed);
  void terminate();
};

