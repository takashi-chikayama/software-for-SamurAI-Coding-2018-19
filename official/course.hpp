#include <iostream>
#include <list>
#include <algorithm>
#include <boost/foreach.hpp>
#include <boost/property_tree/ptree.hpp>
#include <boost/property_tree/json_parser.hpp>

using namespace std;
using namespace boost::property_tree;

struct IntVec {
  int x, y;
  IntVec operator+(IntVec &another);
  bool operator==(const IntVec &another) const;
  IntVec(int x = 0, int y = 0): x(x), y(y) {};
};

typedef IntVec Position;

struct Movement {
  Position from, to;
  bool intersects(const Movement &m) const;
  list <Position> touchedSquares() const;
  Movement() {};
  Movement(Position from, Position to): from(from), to(to) {};
};

const string CourseDataFileType = "race course 2018";

struct RaceCourse {
  ptree courseTree;
  int width, length;
  int vision;
  int64_t thinkTime;
  int stepLimit;
  int startX[2];
  char **squares;
  RaceCourse(istream &in);
};

ostream & operator <<(ostream &out, const IntVec &v);
ostream & operator <<(ostream &out, const RaceCourse &c);
