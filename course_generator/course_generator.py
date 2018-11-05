#!/usr/bin/env python
import glob
import json
import math
import random
import sys


def gen_g(w, symmetric):
    t = random.randrange(0, 3 if symmetric else 5)
    if t == 0 and 1 < w // 3 : # center one
        w1 = random.randrange(1, w // 3)
        return [[0] * w1 + [1] * (w - 2 * w1) + [0] * w1]
    elif t == 1 and 2 < w // 3: # double side
        w1 = random.randrange(2, w // 3)
        w2 = (w - w1) // 2
        return [[1] * w2 + [0] * w1 + [1] * (w - w1 - w2)]
    elif t == 2 and 1 < w - 3: # random two holes
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
    elif t == 3 and 2 < w // 3: # right one
        w1 = random.randrange(2, w // 3)
        return [[0] * w1 + [1] * (w - w1)]
    elif t == 4 and 2 < w // 3: # left one
        w1 = random.randrange(2, w // 3)
        return [[1] * (w - w1) + [0] * w1]
    elif 1 < w - 3: # random size 2
        s = random.randrange(1, w - 3)
        return [[1] * s + [0] * 2 + [1] * (w - s - 2)]
    else:
        return [[0] * w]

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
    return [[0] * w] + m
    
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
    return [[0] * w] + m

def paint_block(x, y, w, d, block, visited):
    if (not (0 <= x < w and 0 <= y < d)):
        return
    if block[y][x] == 1 or visited[y][x]:
        return
    visited[y][x] = True
    for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
        paint_block(x + dx, y + dy, w, d, block, visited)

def check_block(m, w, d):
    visited = [[False] * w for i in range(d)]
    for x in range(w):
        paint_block(x, d - 1, w, d, m, visited)
    for x in range(w):
        if not visited[0][x]:
            return False
    for y in range(1, d - 1):
        for x in range(w):
            if not visited[y][x]:
                m[y][x] = 1
    return True

def scale_block(block, w, reverse):
#    print('scale_block, w=%s' % w)
    orig_w = int(block['width'])
    if orig_w > w:
        raise
    length = block['length']
    squares = []
    for y in range(length):
        line = []
        for x in range(w):
            x1 = w - 1 - x if reverse else x
            orig_x = int(round((x1 / (w - 1)) * (orig_w - 1)))
            line.append(block['squares'][y * orig_w + orig_x])
        squares.append(line)
    return squares
    
def next_logo(w):
    if len(logos) == 0:
        return []
    logo = logos[random.randrange(0, len(logos))]
    return scale_block(logo, w, False)

def next_pattern(w):
    if len(blocks) == 0:
        return []
    b = blocks[random.randrange(0, len(blocks))]
    return scale_block(b, w, random.random() < 0.5)

def next_block(m, w, symmetric):
    while True:
        sym = symmetric or (random.random() < 0.5)
        r1 = random.randrange(0, 4)
        if r1 == 0:
            block = gen_pond(w, sym)
        elif r1 == 1:
            block =  [[0] * w] + gen_g(w, sym)
        elif r1 == 2:
            block = gen_areas(w, sym)
        else:
            block = gen_one_rocks(w, sym)

        if check_block(block, w, len(block)):
            return block

def load_json_file(fname):
    with open(fname) as f:
        return json.load(f)

def load_courses_dir(dir, w):
    r = []
    for fname in glob.glob(dir+'/*.json'):
        course = load_json_file(fname)
        if course['width'] <= w:
            r.append(course)
    return r

def block_goback(block):
    h = len(block)
    w = len(block[0])
    rblock = list(reversed(block))
    mins = [[-1] * w for i in range(h)]
    need_v = 0
    for ylimit in range(1, h):
        visited = [[False] * w for i in range(ylimit)]
        for x in range(w):
            paint_block(x, 0, w, ylimit, rblock, visited)
        for y in range(ylimit):
            for x in range(w):
                if visited[y][x] and mins[y][x] < 0:
                    mins[y][x] = ylimit
                    need_v = max(need_v, ylimit - y + 1)
    return need_v

def step_limit(m):
    h = len(m)
    w = len(m[0])
    dists = [[h * w] * w for y in range(h)]
    q = []
    for x in range(w):
        if m[h - 1][x] != 1:
            dists[h - 1][x] = 0
            q.append((x, h - 1))
    d = 0
    while len(q) > 0:
        newq = []
        d += 1
        for x, y in q:
            for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
                x1, y1 = x + dx, y + dy
                if (not (0 <= x1 < w and 0 <= y1 < h)):
                    continue
                if m[y1][x1] != 1 and dists[y1][x1] > d:
                    dists[y1][x1] = d
                    newq.append((x1, y1))
        q = newq
    return ((d + 4) // 5) * 5

            

def make_course(w, l, v, sym):
    results = {}
    results['filetype'] = 'race course 2018'
    results['width'] = w
    m = [[0] * w] + next_logo(w)
    last_block = [[0] * w] + next_logo(w)
    l1 = l - len(last_block)
    while True:
        if random.random() > 0.9:
            block = [[0] * w] + next_logo(w)
        elif random.random() > 0.7:
            block = [[0] * w] + next_pattern(w)
        else:
            block = next_block(m, w, sym)
        if len(m) + len(block) > l1:
            m += [[0] * w] * (l1 - len(m))
            break
        else:
            back = block_goback(block)
            v = max(v, back)
            m += block
    m += last_block
    results['length'] = len(m)
    sl = step_limit(m)
    squares = sum(m, [])
    results['squares'] = squares
    x0 = int(math.floor(w / 3))
    x1 = int(math.floor(w * 2 / 3))
    results['vision'] = v
    results['stepLimit'] = sl
    results['thinkTime'] = int(sl // 5 + 1)
    results['x0'] = x0
    results['x1'] = x1
    return results

wmin = 5
wmax = 20


def random_width():
    if random.random() > 0.7:
        return 20
    elif random.random() > 0.7:
        return 15
    elif random.random() > 0.7:
        return 10
    elif random.random() > 0.7:
        return 5
    return random.randrange(wmin, wmax + 1)

lmin = 50
lmax = 100


def random_length():
    if random.random() > 0.7:
        return lmax
    elif random.random() > 0.7:
        return (lmax + lmin) // 2
    elif random.random() > 0.7:
        return lmin
    return random.randrange(lmin, lmax + 1)

vmin = 5
vmax = 20


def random_vision():
    if random.random() > 0.5:
        return vmin
    elif random.random() > 0.7:
        return ((vmin + vmax) // 10) * 5
    elif random.random() > 0.7:
        return vmax
    return random.randrange(vmin, vmax + 1)

width = int(sys.argv[1]) if len(sys.argv) > 1 else random_width()
length = int(sys.argv[2]) if len(sys.argv) > 2 else random_length()
vision = int(sys.argv[3]) if len(sys.argv) > 3 else random_vision()
sym = random.random() < 0.3
logos = load_courses_dir('./logos', width)
blocks = load_courses_dir('./blocks', width)
#print('logos=%s', logos, file=sys.stderr)
#print('blocks=%s', blocks, file=sys.stderr)
print(json.dumps(make_course(width, length, vision, sym), separators=(',', ':')))
