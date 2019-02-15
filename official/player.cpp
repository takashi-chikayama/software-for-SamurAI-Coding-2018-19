#include <stdio.h>
#include <sys/types.h>
#include <signal.h>
#include <cctype>
#include <future>
#include <thread>
#include <chrono>
#include <mutex>
#include <cinttypes>
#include <boost/optional.hpp>

#include "course.hpp"
#include "player.hpp"

using Message = pair<boost::optional<int>, vector<string>>;

static Message readInt(unique_ptr<boost::process::ipstream>& in) {
  vector<string> msg;
  if (!in) {
    msg.push_back("Input stream is closed");
    return make_pair(boost::none, msg);
  }
  int num;
  string str;
  try {
    *in >> str;
    num = stoi(str);
  } catch (const logic_error& e) {
    string clipped;
    if (str.length() >= 100) {
      str = str.substr(0, 100) + "...";
      clipped = "(clipped)";
    }
    const string errmsg =
      typeid(e) == typeid(invalid_argument) ? "Invalid instruction" :
      typeid(e) == typeid(out_of_range) ? "Value out of range" :
      "Invalid instruction";
    msg.push_back(errmsg + "received from AI: \"" + str + "\"" + clipped);
    msg.push_back("\twhat: " + string(e.what()));
    return make_pair(boost::none, msg);
  }
  return make_pair(boost::optional<int>(num), msg);
}

static void handShake(unique_ptr<boost::process::ipstream> in, promise<pair<unique_ptr<boost::process::ipstream>, Message>> p)
{
  auto ans = readInt(in);
  p.set_value(make_pair(move(in), ans));
}

template <class... Args>
void sendToAI(unique_ptr<boost::process::opstream>&  toAI, shared_ptr<ofstream> stdinLogStream, const char *fmt, Args... args) {
  int n = snprintf(nullptr, 0, fmt, args...);
  unique_ptr<char[]> cstr(new char[n + 2]);
  memset(cstr.get(), 0, n + 2);
  snprintf(cstr.get(), n + 1, fmt, args...);
  string str(cstr.get());
  *toAI << str;
  if (stdinLogStream.get() != nullptr) {
    *stdinLogStream << str;
  }
}

void flushToAI(unique_ptr<boost::process::opstream>& toAI, shared_ptr<ofstream> stdinLogStream) {
  toAI->flush();
  if (stdinLogStream.get() != nullptr) stdinLogStream->flush();
}

static void logging(promise<void> promise, unique_ptr<istream> input, shared_ptr<ostream> output, shared_ptr<mutex> mtx, int MAX_SIZE) {
  if (output) {
    int size = 0;
    for (; MAX_SIZE == -1 || size < MAX_SIZE; ++size) {
      char c;
      if (input->get(c)) {
        lock_guard<mutex> lock(*mtx);
        *output << c;
      } else {
        break;
      }
    }
    if (MAX_SIZE != -1 && size >= MAX_SIZE) {
      *output << endl;
      *output << "[system] stderr output have reached the limit(MAX_SIZE=" << MAX_SIZE << " bytes)" << endl;
    }
  }
  promise.set_value();
}

Logger::Logger(unique_ptr<istream> input, shared_ptr<ostream> output, int MAX_SIZE = -1): mtx(new mutex) {
  promise<void> prms;
  ftr = prms.get_future();
  thrd = thread(logging, move(prms), move(input), output, mtx, MAX_SIZE);
}

Logger::~Logger() {
  mtx->unlock();
  future_status result = ftr.wait_for(chrono::milliseconds(500));
  if (result == future_status::timeout) {
    thrd.detach();
  } else {
    thrd.join();
  }
}

const char *categoryName[] = {
  "normal", "finished",
  "goneoff", "obstacled", "collided",
  "noplay",
  "timedout", "died", "invalid"
};

Player::Player(string command, string name, const RaceCourse &course, int xpos,
	       const Option &opt):
  name(name), group(),
  state(PlayerState
	(RACING, Position(xpos, 0), Velocity(0, 0), course.thinkTime)),
  option(opt) {
  if (command.length() == 0) {
    state.state = ALREADY_DISQUALIFIED;
    return;
  }
  auto env = boost::this_process::environment();
  error_code error_code_child;
  unique_ptr<boost::process::ipstream> stderrFromAI(new boost::process::ipstream);
  toAI = unique_ptr<boost::process::opstream>(new boost::process::opstream);
  fromAI = unique_ptr<boost::process::ipstream>(new boost::process::ipstream);
  child = unique_ptr<boost::process::child>(new boost::process::child(
    command,
    boost::process::std_out > *fromAI,
    boost::process::std_err > *stderrFromAI,
    boost::process::std_in < *toAI,
    env,
    error_code_child,
    group
  ));
  if (option.stderrLogStream) {
    *option.stderrLogStream << "[system] Try: hand shake" << endl;
  }
  stderrLogger = unique_ptr<Logger>
    (new Logger(move(stderrFromAI), option.stderrLogStream, 1 << 15));
  sendToAI(toAI, option.stdinLogStream, "%d\n%d\n%d %d\n%d\n",
	   course.thinkTime, course.stepLimit,
	   course.width, course.length, course.vision);
  flushToAI(toAI, option.stdinLogStream);
  promise<pair<unique_ptr<boost::process::ipstream>, Message>> prms;
  future<pair<unique_ptr<boost::process::ipstream>, Message>> ftr = prms.get_future();
  chrono::milliseconds remain(state.timeLeft);
  thread thrd(handShake, move(fromAI), std::move(prms));
  chrono::system_clock::time_point start = chrono::system_clock::now();
  future_status result = ftr.wait_for(remain);
  chrono::system_clock::time_point end = chrono::system_clock::now();
  auto timeUsed = chrono::duration_cast<chrono::milliseconds>(end - start).count();
  state.timeLeft -= timeUsed;
  stderrLogger->mtx->lock();
  if (option.stderrLogStream) {
    *option.stderrLogStream << "[system] spend time: " << timeUsed << ", remain: " << state.timeLeft << endl;
  }
  if (option.pauseCommand) {
    error_code ec;
    int result = boost::process::system(boost::process::shell, option.pauseCommand.get(), ec, boost::process::std_out > stderr);
    cerr << __FILE__ << ":" << __LINE__ << ": [pause] (" << name << ") return code: " << result << ", error value: " << ec.value() << ", error message: " << ec.message() << endl;
  }
  if (result == future_status::timeout) {
    state.state = ALREADY_DISQUALIFIED;
    cerr << "player: \"" << name
	      << "\" did not respond in time during initiation" << endl;
    if (option.stderrLogStream) {
      *option.stderrLogStream << "your AI: \"" << name
			      << "\" did not respond in time during initiation"
			      << endl;
    }
    thrd.detach();
    return;
  }
  thrd.join();
  auto ret = ftr.get();
  fromAI = move(ret.first);
  auto ans = ret.second.first;
  for (const auto& line: ret.second.second) {
    cerr << line << endl;
    if (option.stderrLogStream) {
      *option.stderrLogStream << "[system] " << line << endl;
    }
  }
  if (!ans || ans.get() != 0) {
    if (option.stderrLogStream) {
      *option.stderrLogStream << "[system] Failed...: hand shake" << endl;
    }
    if (!child->running()) {
      cerr << "player: \"" << name << "\" died." << endl;
      cerr << "\texit code: " << child->exit_code() << endl;
      if (option.stderrLogStream) {
        *option.stderrLogStream << "[system] your AI: \"" << name << "\" died." << endl;
        *option.stderrLogStream << "[system] \texit code: " << child->exit_code() << endl;
      }
      state.state = ALREADY_DISQUALIFIED;
      return;
    }
    if (ans) {
      int v = ans.get();
      cerr << "Response at initialization of player \"" << name << "\": ("
     << v << ") is non-zero" << endl;
      if (option.stderrLogStream) {
        *option.stderrLogStream << "[system] Response at initialization of player \"" << name << "\": (" << v << ") is non-zero" << endl;
      }
    }
    state.state = ALREADY_DISQUALIFIED;
  } else {
    if (option.stderrLogStream) {
      *option.stderrLogStream << "[system] Success!: hand shake" << endl;
    }
  }
}

using Message4Act = pair<boost::optional<pair<int, int>>, vector<string>>;

static void readAct(unique_ptr<boost::process::ipstream> in, promise<pair<unique_ptr<boost::process::ipstream>, Message4Act>> p)
{
  auto ax = readInt(in);
  auto ay = readInt(in);

  vector<string> msg;
  msg.insert(msg.end(), ax.second.begin(), ax.second.end());
  msg.insert(msg.end(), ay.second.begin(), ay.second.end());
  if (ax.first && ay.first) {
    p.set_value(
      make_pair(
        move(in),
        make_pair(
          boost::optional<pair<int, int>>(make_pair(ax.first.get(), ay.first.get())),
          msg
        )
      )
    );
  } else {
    p.set_value(make_pair(move(in), make_pair(boost::none, msg)));
  }
}

ResultCategory Player::
plan(int stepNumber, Player &op, RaceCourse &course, int visibility,
     Acceleration &accel, int64_t &timeUsed) {
  if (option.stderrLogStream) {
    *option.stderrLogStream << "[system] ================================" << endl;
    *option.stderrLogStream << "[system] turn: " << stepNumber << endl;
  }
  sendToAI(toAI, option.stdinLogStream, "%d\n%" PRId64 "\n%d %d %d %d\n",
	   stepNumber, state.timeLeft,
	   state.position.x, state.position.y,
	   state.velocity.x, state.velocity.y);
  if (op.state.state == RACING) {
    sendToAI(toAI, option.stdinLogStream, "%d %d %d %d\n",
	     op.state.position.x, op.state.position.y,
	     op.state.velocity.x, op.state.velocity.y);
  } else {
    sendToAI(toAI, option.stdinLogStream, "0 %d 0 0\n",
	     course.length);
  }
  for (int y = 0; y < course.length; y++) {
    for (int x = 0; x < course.width; ++x) {
      if (x != 0) {
        sendToAI(toAI, option.stdinLogStream, " ", 0);
      }
      sendToAI(toAI, option.stdinLogStream, "%d",
	       y < visibility ? course.squares[y][x]: -1);
    }
    sendToAI(toAI, option.stdinLogStream, "\n", 0);
  }
  flushToAI(toAI, option.stdinLogStream);
  promise<pair<unique_ptr<boost::process::ipstream>, Message4Act>> prms;
  future<pair<unique_ptr<boost::process::ipstream>, Message4Act>> ftr = prms.get_future();
  stderrLogger->mtx->unlock();
  if (option.resumeCommand) {
    error_code ec;
    int result = boost::process::system(boost::process::shell, option.resumeCommand.get(), ec, boost::process::std_out > stderr);
    cerr << __FILE__ << ":" << __LINE__ << ": [resume] (" << name << ") return code: " << result << ", error value: " << ec.value() << ", error message: " << ec.message() << endl;
  }
  chrono::milliseconds remain(state.timeLeft);
  thread thrd(readAct, move(fromAI), std::move(prms));
  chrono::system_clock::time_point start = chrono::system_clock::now();
  future_status result = ftr.wait_for(remain);
  chrono::system_clock::time_point end = chrono::system_clock::now();
  timeUsed = chrono::duration_cast<chrono::milliseconds>(end - start).count();
  state.timeLeft -= timeUsed;
  stderrLogger->mtx->lock();
  if (option.stderrLogStream) {
    *option.stderrLogStream << "[system] spend time: " << timeUsed
			    << ", remain: " << state.timeLeft << endl;
  }
  if (option.pauseCommand) {
    error_code ec;
    int result = boost::process::system(boost::process::shell, option.pauseCommand.get(), ec, boost::process::std_out > stderr);
    cerr << __FILE__ << ":" << __LINE__ << ": [pause] (" << name << ") return code: " << result << ", error value: " << ec.value() << ", error message: " << ec.message() << endl;
  }
  if (result == future_status::timeout) {
    cerr << "player: " << name
	      << " did not respond in time at step "
	      << stepNumber << endl;
    if (option.stderrLogStream) {
      *option.stderrLogStream
	<< "[system] your AI: \""
	<< name << "\" did not respond in time at step "
	<< stepNumber << endl;
    }
    thrd.detach();
    return TIMEDOUT;
  }
  thrd.join();
  auto ret = ftr.get();
  fromAI = move(ret.first);
  for (const auto& line: ret.second.second) {
    cerr << line << endl;
    if (option.stderrLogStream) {
      *option.stderrLogStream << "[system] " << line << endl;
    }
  }
  if (ret.second.first) {
    auto val = ret.second.first.get();
    if (val.first < -1 || 1 < val.first
      || val.second < -1 || 1 < val.second) {
      cerr << "acceleration value must be from -1 to 1 each axis, but player: \"" << name << "\" saied: (" << val.first << ", " << val.second << ")" << endl;
      if (option.stderrLogStream) {
        *option.stderrLogStream << "[system] acceleration value must be from -1 to 1 each axis, but your AI: \"" << name << "\" saied: (" << val.first << ", " << val.second << ")" << endl;
      }
      return INVALID;
    }
    accel = Acceleration(val.first, val.second);
    return NORMAL;
  } else {
    if (!child->running()) {
      cerr << "player: \"" << name << "\" died." << endl;
      cerr << "\texit code: " << child->exit_code() << endl;
      if (option.stderrLogStream) {
        *option.stderrLogStream << "[system] your AI: \"" << name << "\" died." << endl;
        *option.stderrLogStream << "[system] \texit code: " << child->exit_code() << endl;
      }
      return DIED;
    }
    return INVALID;
  }
}

void Player::terminate() {
  error_code ec;
  group.terminate(ec);
  if (option.stderrLogStream) {
    *option.stderrLogStream << "[system] terminate your AI: \"" << name << "\"" << endl;
    *option.stderrLogStream << "[system] \terror code: " << ec.value() << endl;
    *option.stderrLogStream << "[system] \tmessage: \"" << ec.message() << endl;
  }
}

