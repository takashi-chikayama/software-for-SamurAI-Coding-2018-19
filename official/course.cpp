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
