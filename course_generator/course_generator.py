#!/usr/bin/env python
import json
import sys
import math
import random


def gen_g(w, symmetric):
    t = random.randrange(0, 3 if symmetric else 5)
    if t == 0: # center one
        w1 = random.randrange(1, w // 3)
        return [[0] * w1 + [1] * (w - 2 * w1) + [0] * w1]
    elif t == 1: # double side
        w1 = random.randrange(2, w // 3)
        w2 = (w - w1) // 2
        return [[1] * w2 + [0] * w1 + [1] * (w - w1 - w2)]
    elif t == 2: # random two holes
        ret = [1] * w
        s1 = random.randrange(1, w - 3)
        if symmetric:
            s2 = w - 2 - s1
        else:
            s2 = random.randrange(1, w - 3)
        ret[s1] = 0
        ret[s1 + 1] = 0
        ret[s2] = 0
        ret[s2 + 1] = 0
        return [ret]
    elif t == 3: # right one
        w1 = random.randrange(2, w // 3)
        return [[0] * w1 + [1] * (w - w1)]
    elif t == 4: # left one
        w1 = random.randrange(2, w // 3)
        return [[1] * (w - w1) + [0] * w1]
    else: # random size 2
        s = random.randrange(1, w - 3)
        return [[1] * s + [0] * 2 + [1] * (w - s - 2)]

def gen_pond(w, symmetric):
    d = random.randrange(1, 5)
    m = [[2] * w for i in range(d)]
    r = random.random() * 0.3
    r = r * (0.5 if symmetric else 1.0)
    for i in range(int(r * d * w)):
        y = random.randrange(0, d)
        x = random.randrange(0, w)
        m[y][x] = 0
        if symmetric:
            m[y][w - 1 - x] = 0
    return m

def gen_one_rocks(w, symmetric):
    d = random.randrange(1, 5)
    m = [[0] * w for i in range(d)]
    r = 0.1 + random.random() * 0.8
    r = r * (0.5 if symmetric else 1.0)
    for i in range(int(r * d * w)):
        y = random.randrange(0, d)
        x = random.randrange(0, w)
        m[y][x] = 1
        if symmetric:
            m[y][w - 1 - x] = 1
    return m + [[0] * w]
    
# dy = abs(

def make_shape(w, h):
    shape = [[True] * w for y in range(h)]
    for dy in (-1, 1):
        y1 = h // 2 + dy
        xlow, xhigh = 0, w
        while y1 >= 0 and y1 < h:
            d = abs(y1 - h // 2) / (h - h // 2)
            xlow += int(0.5 + w * random.random() * math.sqrt(1 - d * d) / 2.0)
            xhigh -= int(0.5 + w * random.random() * math.sqrt(1 - d * d) / 2.0)
            for x in range(0, min(w, xlow)):
                shape[y1][x] = 0
            for x in range(max(0, xhigh), w):
                shape[y1][x] = 0
            y1 += dy
    return shape


def put_shape(m, shape, sx, sy, color, symmetric):
    sw, sh = len(shape[0]), len(shape)
    w, h = len(m[0]), len(m)
    for y in range(sh):
        y1 = sy + y
        if y1 < 0 or y1 >= h: continue
        for x in range(sw):
            x1 = sx + x
            if x1 < 0 or x1 >= w: continue
            if not shape[y][x]: continue
            m[y1][x1] = color
            if symmetric:
                m[y1][len(m[y1]) - 1 - x1] = color


def gen_areas(w, symmetric):
    h = random.randrange(3, 10)
    m = [[0] * w for i in range(h)]
    n_r = random.randrange(2, 5)
    if symmetric:
        n_r = (n_r + 1) // 2
    for i in range(n_r):
        shape = make_shape(random.randrange(w // 6, w // 2 ),
                           random.randrange(2, h + 1))
        sw, sh = len(shape[0]), len(shape)
        sx = random.randrange(-sw // 4, w - sw // 4)
        sy = random.randrange(-sh // 4, h - sh // 4)
        put_shape(m, shape, sx, sy, 1, symmetric)
    n_p = random.randrange(0, 4)
    for i in range(n_r):
        shape = make_shape(random.randrange(w // 8, w // 4 ),
                           random.randrange(2, h + 1))
        sw, sh = len(shape[0]), len(shape)
        sx = random.randrange(-sw // 4, w - sw // 4)
        sy = random.randrange(-sh // 4, h - sh // 4)
        put_shape(m, shape, sx, sy, 2, symmetric)
    return m + [[0] * w]


def paint_block(x, y, w, d, block, visited):
    if x < 0 or w <= x or y < 0 or d <= y:
        return
    if block[y][x] == 1 or visited[y][x]:
        return
    visited[y][x] = True
    for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
        paint_block(x + dx, y + dy, w, d, block, visited)
        

def check_block(m, w, d):
    visited = [[False] * w for i in range(d)]
#    print(m, visited, file=sys.stderr)
    for x in range(w):
        paint_block(x, 0, w, d, m, visited)
    for x in range(w):
        if not visited[d - 1][x]:
            return False
    for y in range(1, d - 1):
        for x in range(w):
            if not visited[y][x]:
                m[y][x] = 1
    return True
    
def next_block(m, w, symmetric):
    while True:
        sym = symmetric or (random.random() < 0.5)
        r1 = random.randrange(0, 4)
        # r1 = 2
        if r1 == 0:
            block = gen_pond(w, sym)
        elif r1 == 1:
            block = gen_g(w, sym) + [[0] * w]
        elif r1 == 2:
            block = gen_areas(w, sym)
        else:
            block = gen_one_rocks(w, sym)

        if check_block(block, w, len(block)):
            return block


def make_course(w, l, v, sym):
    results = {}
    results['filetype'] = 'race course 2018'
    results['width'] = w
    results['length'] = l
    results['vision'] = v
    m = [[0] * w]
    while True:
        block = next_block(m, w, sym)
        if len(m) + len(block) > l:
            m += [[0] * w] * (l - len(m))
            break
        else:
            m += block
    squares = sum(m, [])
    results['squares'] = squares
    tt = 120
    sl = l
    x0 = int(math.floor(w / 3))
    x1 = int(math.floor(w * 2 / 3))
    results['thinkTime'] = tt
    results['stepLimit'] = sl
    results['x0'] = x0
    results['x1'] = x1
    return results

wmin = 10
wmax = 30
lmin = 40
lmax = 200
vmin = 3
vmax = 20
width = int(sys.argv[1]) if len(sys.argv) > 1 else random.randrange(wmin, wmax + 1)
length = int(sys.argv[2]) if len(sys.argv) > 2 else random.randrange(lmin, lmax + 1)
vision = int(sys.argv[3]) if len(sys.argv) > 3 else random.randrange(vmin, vmax + 1)
sym = random.random() < 0.3
print('w = %s, l = %s, v = %s' % (width, length, vision), file=sys.stderr)
print(json.dumps(make_course(width, length, vision, sym), separators=(',', ':')))
