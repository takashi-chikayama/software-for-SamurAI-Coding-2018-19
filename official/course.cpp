#include <algorithm>
#include <stdexcept>
#include <cmath>
#include "course.hpp"

IntVec IntVec::operator+(IntVec &another) {
  return IntVec(x + another.x, y + another.y);
}

bool IntVec::operator==(const IntVec &another) const {
  return x == another.x && y == another.y;
}

bool Movement::intersects(const Movement &m) const {
  int minx = min(from.x, to.x);
  int maxx = max(from.x, to.x);
  int minmx = min(m.from.x, m.to.x);
  int maxmx = max(m.from.x, m.to.x);
  if (maxx < minmx || maxmx < minx ) return false;
  int miny = min(from.y, to.y);
  int maxy = max(from.y, to.y);
  int minmy = min(m.from.y, m.to.y);
  int maxmy = max(m.from.y, m.to.y);
  if (maxy < minmy || maxmy < miny ) return false;
  int d1 = (from.x-m.from.x)*(m.to.y-m.from.y)-(from.y-m.from.y)*(m.to.x-m.from.x);
  int d2 = (to.x-m.from.x)*(m.to.y-m.from.y)-(to.y-m.from.y)*(m.to.x-m.from.x);
  if (d1*d2 > 0) return false; 
  int d3 = (m.from.x-from.x)*(to.y-from.y)-(m.from.y-from.y)*(to.x-from.x);
  int d4 = (m.to.x-from.x)*(to.y-from.y)-(m.to.y-from.y)*(to.x-from.x);
  if (d3*d4 > 0) return false; 
  return true;
}

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

RaceCourse::RaceCourse(istream &in) {
  read_json(in, courseTree);
  if (!courseTree.get_child_optional("filetype") ||
      courseTree.get<string>("filetype") != CourseDataFileType) {
    cerr << "The input file does not contain race course data" << endl;
    exit(1);
  }
  width = courseTree.get<int>("width");
  length = courseTree.get<int>("length");
  vision = courseTree.get<int>("vision");
  thinkTime = 1000*courseTree.get<int>("thinkTime");
  stepLimit = courseTree.get<int>("stepLimit");
  startX[0] = courseTree.get<int>("x0");
  startX[1] = courseTree.get<int>("x1");
  int x = width-1, y = -1;
  squares = new char*[length];
  for (auto s: courseTree.get_child("squares")) {
    if (++x == width) {
      x = 0;
      squares[++y] = new char[width];
    }
    squares[y][x] = stoi(s.second.data());
  }
}

ostream &operator << (ostream &out, const IntVec &v) {
  out << "{ \"x\": " << v.x << ", \"y\": " << v.y << " }";
  return out;
}

ostream &operator << (ostream &out, const RaceCourse &c) {
  out << "{" << endl
      << "  \"filetype\": \"" << CourseDataFileType << "\"," << endl
      << "  \"width\": " << c.width  << "," << endl
      << "  \"length\": " << c.length << "," << endl
      << "  \"vision\": " << c.vision << "," << endl
      << "  \"thinkTime\": " << c.thinkTime << "," << endl
      << "  \"stepLimit\": " << c.stepLimit << ',' << endl
      << "  \"x0\": " << c.startX[0] << "," << endl
      << "  \"x1\": " << c.startX[1] << ',' << endl
      << "  \"squares\": [";
  for (int y = 0; y != c.length; y++) {
    out << endl << "    ";
    for (int x = 0; x != c.width; x++) {
      out << (int)c.squares[y][x];
      if (y != c.length-1 || x != c.width-1) out << ",";
    }
  }
  out << endl << "  ]" << endl << "}";
  return out;
}
