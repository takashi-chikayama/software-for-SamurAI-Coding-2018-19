#!/usr/bin/env python3
import heapq
import itertools
import math

SEARCHDEPTH = 7
SPEEDLIMIT = 1000
searchDepth = SEARCHDEPTH
speedLimitSquared = SPEEDLIMIT * SPEEDLIMIT
nextSeq = 1


# raceInfo.hpp
class IntVec(object):
    def __init__(self, x=0, y=0):
        self.x = x
        self.y = y

    def __add__(self, v):
        return IntVec(self.x + v.x, self.y + v.y)

    def __eq__(self, v):
        return self.x == v.x and self.y == v.y

    def __lt__(self, v):
        return self.x > v.x if self.y == v.y else self.y < v.y

    def __str__(self):
        return '(%s,%s)' % (self.x, self.y)

    def __hash__(self):
        return hash((self.x, self.y))


class RaceCourse(object):
    def __init__(self, thinkTime, stepLimit, width, length, vision):
        self.thinkTime = thinkTime
        self.stepLimit = stepLimit
        self.width = width
        self.length = length
        self.vision = vision

    def __str__(self):
        return 'RaceCourse(%s, %s, %s, %s, %s)' % (
            self.thinkTime, self.stepLimit, self.width,
            self.length, self.vision)


def inputRaceCourse():
    thinkTime = int(input())
    stepLimit = int(input())
    width, length = (int(x) for x in input().split())
    vision = int(input())
    return RaceCourse(thinkTime, stepLimit, width, length, vision)


def addSquares(x, y0, y1, squares):
    if y1 > y0:
        for y in range(y0, y1 + 1, 1):
            squares.append(IntVec(x, y))
    else:
        for y in range(y0, y1 - 1, -1):
            squares.append(IntVec(x, y))


class Movement(object):
    def __init__(self, from_, to):
        self.from_ = from_
        self.to = to

    def __str__(self):
        return 'Movement(%s,%s)' % (self.from_, self.to)

    def touchedSquares(self):
        r = []
        if self.to.x == self.from_.x:
            addSquares(self.from_.x, self.from_.y, self.to.y, r)
        else:
            a = (self.to.y - self.from_.y) / (self.to.x - self.from_.x)
            sgnx = 1 if self.from_.x < self.to.x else -1
            y1 = a * sgnx / 2.0 + self.from_.y + 0.5
            iy1 = (math.floor(y1) if self.to.y > self.from_.y
                   else math.ceil(y1) - 1)
            addSquares(self.from_.x, self.from_.y, iy1, r)
            for x in range(self.from_.x + sgnx, self.to.x, sgnx):
                y0 = a * (x - self.from_.x - sgnx / 2) + self.from_.y + 0.5
                y1 = a * (x - self.from_.x + sgnx / 2) + self.from_.y + 0.5
                if self.to.y > self.from_.y:
                    iy0, iy1 = math.ceil(y0) - 1, math.floor(y1)
                else:
                    iy0, iy1 = math.floor(y0), math.ceil(y1) - 1
                addSquares(x, iy0, iy1, r)
            y0 = a * (self.to.x - self.from_.x - sgnx / 2) + self.from_.y + 0.5
            iy0 = (math.ceil(y0) - 1 if self.to.y > self.from_.y
                   else math.floor(y0))
            addSquares(self.to.x, iy0, self.to.y, r)
        return r


class PlayerState(object):
    def __init__(self, position, velocity):
        self.position = position
        self.velocity = velocity

    def __str__(self):
        return 'PlayerState(%s, %s)' % (self.position, self.velocity)

    def __eq__(self, v):
        return self.position == v.position and self.velocity == v.velocity

    def __lt__(self, v):
        if self.position == v.position:
            return self.velocity < v.velocity
        else:
            return self.position < v.position

    def __hash__(self):
        return hash((self.position, self.velocity))


def inputPlayerState():
    cs = [int(x) for x in input().split()]
    return PlayerState(IntVec(cs[0], cs[1]), IntVec(cs[2], cs[3]))


class RaceInfo(object):
    def __init__(self, stepNumber, timeLeft, me, opponent, squares):
        self.stepNumber = stepNumber
        self.timeLeft = timeLeft
        self.me = me
        self.opponent = opponent
        self.squares = squares

    def __str__(self):
        return 'RaceInfo(%s, %s, %s, %s, %s)' % (
            self.stepNumber, self.timeLeft, self.me,
            self.opponent, self.squares)


def inputRaceInfo():
    stepNumber = int(input())
    timeLeft = int(input())
    me = inputPlayerState()
    opponent = inputPlayerState()
    squares = [[int(x) for x in input().split()] for y in range(course.length)]
    return RaceInfo(stepNumber, timeLeft, me, opponent, squares)


class Candidate(object):
    def __init__(self, t, s, f, a):
        global nextSeq
        global course
        self.seq = nextSeq
        nextSeq += 1
        self.step = t
        self.state = s
        self.from_ = f
        self.how = a
        self.goaled = s.position.y >= course.length
        if self.goaled:
            self.goalTime = (self.step + (course.length - s.position.y - 0.5)
                             / s.velocity.y)

    def __lt__(self, c):
        if self.goaled:
            return not c.goaled or c.goalTime > self.goalTime
        elif self.state == c.state:
            return c.step > self.step
        else:
            return c.state < self.state

    def __str__(self):
        return ('#%s:%s@(%s,%s)+(%s,%s) <- #%s' %
                (self.seq, self.step, self.state.position.x,
                 self.state.position.y, self.state.velocity.x,
                 self.state.velocity.y,
                 (0 if self.from_ is None else self.from_.seq)))


def plan(info, course):
    candidates = []
    reached = {}
    initial = PlayerState(info.me.position, info.me.velocity)
    initialCand = Candidate(0, initial, None, IntVec(0, 0))
    reached[initial] = initialCand
    best = initialCand
    heapq.heappush(candidates, initialCand)
    while len(candidates) > 0:
        c = heapq.heappop(candidates)
        for cay, cax in itertools.product(range(1, -2, -1), range(-1, 2)):
            accel = IntVec(cax, cay)
            velo = c.state.velocity + accel
            if velo.x * velo.x + velo.y * velo.y <= speedLimitSquared:
                pos = c.state.position + velo
                if 0 <= pos.x and pos.x < course.width:
                    move = Movement(c.state.position, pos)
                    touched = move.touchedSquares()
                    if (pos != info.opponent.position and
                        not any(0 <= s.y and s.y < course.length and
                                info.squares[s.y][s.x] == 1 for s in touched)):
                        if (0 <= pos.y and pos.y < course.length and
                                info.squares[pos.y][pos.x] == 2):
                            velo = IntVec(0, 0)
                        nextState = PlayerState(pos, velo)
                        nextCand = Candidate(c.step + 1, nextState, c, accel)
                        if (not nextCand.goaled and
                            c.step < searchDepth and
                            (nextState not in reached or
                             reached[nextState].step > c.step + 1)):
                            heapq.heappush(candidates, nextCand)
                            reached[nextState] = nextCand
                        if nextCand < best:
                            best = nextCand
    if best == initialCand:
        ax = 0
        ay = 0
        if info.me.velocity.x < 0:
            ax += 1
        elif info.me.velocity.x > 0:
            ax -= 1
        if info.me.velocity.y < 0:
            ay += 1
        elif info.me.velocity.y > 0:
            ay -= 1
        return IntVec(ax, ay)
    c = best
    while c.from_ != initialCand:
        c = c.from_
    return c.how


def main():
    global course
    course = inputRaceCourse()
    print('0', flush=True)
    try:
        while True:
            info = inputRaceInfo()
            accel = plan(info, course)
            print('%d %d' % (accel.x, accel.y), flush=True)
    except EOFError:
        pass


if __name__ == '__main__':
    main()
