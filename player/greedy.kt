import java.util.*
import java.io.*
import kotlin.math.*

const val SEARCHDEPTH = 7
const val SPEEDLIMIT = 1000
const val searchDepth = SEARCHDEPTH
const val speedLimitSquared = SPEEDLIMIT * SPEEDLIMIT
var nextSeq = 1

data class IntVec(val x : Int, val y : Int) {
  operator fun plus(v : IntVec) : IntVec {
    return IntVec(x + v.x, y + v.y)
  }
  operator fun compareTo(other : IntVec) : Int {
    return if (y == other.y) other.x - x else y - other.y
  }
}

data class RaceCourse(val thinkTime : Int, val stepLimit : Int, val width : Int, val length : Int, val vision : Int) {
  constructor(input : java.util.Scanner) :this(input.nextInt(), input.nextInt(), input.nextInt(), input.nextInt(), input.nextInt()) {}
}

fun addSquares(x : Int, y0 : Int, y1 : Int, squares : MutableList<IntVec>) {
  for (y in (if (y1 > y0) y0..y1 else y0 downTo y1)) squares.add(IntVec(x, y))
}

data class Movement(val from : IntVec, val to : IntVec) {
  fun touchedSquares() : MutableList<IntVec> {
    val r : MutableList<IntVec> = mutableListOf()
    if (to.x == from.x) addSquares(from.x, from.y, to.y, r)
    else {
      val a : Double = (to.y - from.y).toDouble() / (to.x - from.x).toDouble()
      val sgnx = if (from.x < to.x) 1 else -1
      var y1 = a * sgnx / 2.0 + from.y + 0.5
      var iy1 = (if (to.y > from.y) floor(y1) else ceil(y1) - 1).toInt()
      addSquares(from.x, from.y, iy1, r)
      for (x in (if (sgnx > 0) (from.x + sgnx)..(to.x - 1) else (from.x + sgnx).downTo(to.x + 1))) {
        val y0 = a * (x - from.x - sgnx / 2.0) + from.y + 0.5
        y1 = a * (x - from.x + sgnx / 2.0) + from.y + 0.5
        val iy0 = (if (to.y > from.y) ceil(y0) - 1 else floor(y0)).toInt()
        iy1 = (if (to.y > from.y) floor(y1) else ceil(y1) - 1).toInt()
        addSquares(x, iy0, iy1, r)
      }
      val y0 = a * (to.x - from.x - sgnx / 2.0) + from.y + 0.5
      val iy0 = (if (to.y > from.y) ceil(y0) - 1 else floor(y0)).toInt()
      addSquares(to.x, iy0, to.y, r)
    }
    return r
  }
}

data class PlayerState(val position : IntVec, val velocity : IntVec) {
  constructor (input : java.util.Scanner) : this(IntVec(input.nextInt(), input.nextInt()), IntVec(input.nextInt(), input.nextInt())) {}
  operator fun compareTo(other : PlayerState) : Int {
    val c1 = position.compareTo(other.position)
    return if (c1 == 0) velocity.compareTo(other.velocity) else c1
  }
}

data class RaceInfo(val stepNumber : Int, val timeLeft : Int, val me : PlayerState, val opponent : PlayerState, val squares : List<List<Int>>) {
  constructor(input : java.util.Scanner, course : RaceCourse) 
     :this(input.nextInt(), input.nextInt(), PlayerState(input),
           PlayerState(input),
           Array(course.length, {Array(course.width, {input.nextInt()}).asList()}).asList()) {}
}

data class Candidate(val course : RaceCourse, val step : Int, val state : PlayerState, val from : Candidate?, val how : IntVec) : Comparable<Candidate> {
  val seq = nextSeq
  init {
    nextSeq += 1
  }
  val goaled = state.position.y >= course.length
  val goalTime = if (goaled) (step + course.length - state.position.y - 0.5) / state.velocity.y else 0.0

  operator override fun compareTo(other : Candidate) : Int {
    if (goaled) {
      if (!other.goaled || other.goalTime > goalTime) return -1
      else if (other.goalTime < goalTime) return 1
      else return 0
    } else if (state == other.state) return step - other.step
    else return other.state.compareTo(state)
  }

  override fun toString() : String {
    return "#${seq}: ${step}@(${state.position.x},${state.position.y})+(${state.velocity.x},${state.velocity.y}) <- #${from?.seq ?: 0}"
  }
}



fun plan(info : RaceInfo, course : RaceCourse) : IntVec {
  val candidates = PriorityQueue<Candidate>()
  val initial = PlayerState(info.me.position, info.me.velocity)
  val initialCand = Candidate(course, 0, initial, null, IntVec(0, 0))
  val reached = mutableMapOf(initial to initialCand)
  var best = initialCand
  candidates.add(initialCand)
  while (!candidates.isEmpty()) {
    val c = candidates.poll()
    for (cay in 1 downTo -1) {
      for (cax in -1..1) {
        val accel = IntVec(cax, cay)
        var velo = c.state.velocity + accel
        if (velo.x * velo.x + velo.y * velo.y <= speedLimitSquared) {
          val pos = c.state.position + velo
          if (0 <= pos.x && pos.x < course.width) {
            val move = Movement(c.state.position, pos)
            val touched = move.touchedSquares()
            if (pos != info.opponent.position &&
                touched.all { s ->
                  0 > s.y || s.y >= course.length ||
                  info.squares[s.y][s.x] != 1}) {
              if (0 <= pos.y && pos.y < course.length &&
                  info.squares[pos.y][pos.x] == 2) {
                velo = IntVec(0, 0)
              }
              val nextState = PlayerState(pos, velo)
              val nextCand = Candidate(course, c.step + 1, nextState, c, accel)
              if (!nextCand.goaled &&
                  c.step < searchDepth &&
                  (!reached.containsKey(nextState) ||
                  reached[nextState]!!.step > c.step + 1)) {
                candidates.add(nextCand)
                reached[nextState] = nextCand
                if (nextCand < best) best = nextCand
              }
            }
          }
        }
      }
    }
  }
  if (best == initialCand) {
    var ax = 0
    var ay = 0
    if (info.me.velocity.x < 0) ax += 1
    else if (info.me.velocity.x > 0) ax -= 1
    if (info.me.velocity.y < 0) ay += 1
    else if (info.me.velocity.y > 0) ay -= 1
    return IntVec(ax, ay)
  }
  var c : Candidate = best
  while (c.from != initialCand) {
    c = c.from!!
  }
  return c.how
}


fun main(args : Array<String>) {
  val input = java.util.Scanner(System.`in`)
  val course = RaceCourse(input)
  println(0)
  System.out.flush()
  try {
    while (true) {
      val info = RaceInfo(input, course)
      val accel = plan(info, course)
      println("${accel.x} ${accel.y}")
      System.out.flush()
    }
  } catch (e : Exception) {
  }
}
