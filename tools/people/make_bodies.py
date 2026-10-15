"""
Builds the shop-floor people: smooth, rigged body meshes for a woman, a curvy woman and a man.

Each body is a signed-distance sculpture of ~30 simple shapes (ellipsoids and tapered capsules)
blended together, meshed with marching cubes, simplified, then skinned to a small skeleton.
Every vertex also records which body part it belongs to, so the game can colour clothes
(top, bottom, sleeves, shoes) per customer without separate meshes.

Run:  python3 tools/people/make_bodies.py
Writes src/game/scene/people/<body>.json (compact base64 buffers).
"""
import base64
import json
import os
import sys

import numpy as np
from skimage import measure
import fast_simplification

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'game', 'scene', 'people')

# Body parts (for clothing colours in the game). Keep in sync with people/parts.ts.
PART = {'head': 0, 'neck': 1, 'chest': 2, 'belly': 3, 'pelvis': 4, 'upperArm': 5, 'foreArm': 6, 'hand': 7, 'thigh': 8, 'shin': 9, 'foot': 10}


def v(*a):
    return np.array(a, dtype=np.float64)


# --------------------------------------------------------------------------- SDF primitives
def sd_ellipsoid(p, c, r):
    q = (p - c) / r
    k0 = np.linalg.norm(q, axis=-1)
    k1 = np.linalg.norm(q / r, axis=-1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_round_cone(p, a, b, ra, rb):
    """Tapered capsule from a (radius ra) to b (radius rb). Inigo Quilez's exact round cone."""
    ba = b - a
    l2 = ba @ ba
    rr = ra - rb
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = p - a
    y = pa @ ba
    z = y - l2
    x = pa * l2 - y[..., None] * ba
    x2 = np.einsum('...i,...i', x, x)
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    out = np.empty_like(y)
    m1 = np.sign(z) * a2 * z2 > k
    m2 = np.sign(y) * a2 * y2 < k
    out[m1] = np.sqrt(x2[m1] + z2[m1]) * il2 - rb
    m2 &= ~m1
    out[m2] = np.sqrt(x2[m2] + y2[m2]) * il2 - ra
    m3 = ~(m1 | m2)
    out[m3] = (np.sqrt(x2[m3] * a2 * il2) + y[m3] * rr) * il2 - ra
    return out


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


# --------------------------------------------------------------------------- body definitions
def mirror(p):
    return v(-p[0], p[1], p[2])


def skeleton(spec):
    """Bone name -> (parent, head position). Limbs listed for the left (+x) side; right mirrored."""
    s = spec
    sh = v(s['shoulder'], s['shoulderY'], -0.01)
    a1, a2 = np.radians(s['armOut']), np.radians(s['armOut'] - 4)
    elbow = sh + s['upperArm'] * v(np.sin(a1), -np.cos(a1), 0)
    wrist = elbow + s['foreArm'] * v(np.sin(a2), -np.cos(a2), 0.01)
    hip = v(s['hipX'], s['hipY'] - 0.02, 0)
    knee = v(s['hipX'] + 0.005, s['kneeY'], 0.012)
    ankle = v(s['hipX'] + 0.005, 0.085, -0.012)
    bones = [
        ('hips', None, v(0, s['hipY'], 0)),
        ('spine', 'hips', v(0, s['hipY'] + 0.12, 0)),
        ('chest', 'spine', v(0, s['chestY'], 0)),
        ('neck', 'chest', v(0, s['neckY'], 0)),
        ('head', 'neck', v(0, s['neckY'] + 0.09, 0.005)),
    ]
    for side, f in (('L', lambda x: x), ('R', mirror)):
        bones += [
            (f'upperArm.{side}', 'chest', f(sh)),
            (f'foreArm.{side}', f'upperArm.{side}', f(elbow)),
            (f'hand.{side}', f'foreArm.{side}', f(wrist)),
            (f'upperLeg.{side}', 'hips', f(hip)),
            (f'lowerLeg.{side}', f'upperLeg.{side}', f(knee)),
            (f'foot.{side}', f'lowerLeg.{side}', f(ankle)),
        ]
    return bones, dict(sh=sh, elbow=elbow, wrist=wrist, hip=hip, knee=knee, ankle=ankle)


def primitives(spec, j):
    """List of (kind, args, bone, part, blend k)."""
    s = spec
    P = []
    hy, cy, ny = s['hipY'], s['chestY'], s['neckY']
    W = s['width']
    # --- torso
    P.append(('ell', (v(0, hy - 0.02, -0.005), v(0.165 * s['hips'], 0.125, 0.112 * s['hips'])), 'hips', 'pelvis', 0.03))
    for side in (1, -1):
        P.append(('ell', (v(0.068 * side * s['hips'], hy - 0.06, -0.045 * s['seat']), v(0.088 * s['hips'], 0.092, 0.08 * s['seat'])), 'hips', 'pelvis', 0.03))
    P.append(('ell', (v(0, hy + 0.11, 0.006), v(0.125 * s['waist'], 0.12, 0.095 * s['belly'])), 'spine', 'belly', 0.05))
    P.append(('ell', (v(0, cy + 0.02, -0.004), v(0.142 * W, 0.17, 0.104)), 'chest', 'chest', 0.05))
    # bridge between ribs and belly: a man's trunk stays straight, a woman's narrows gently at the waist
    P.append(('ell', (v(0, (hy + 0.11 + cy) / 2, 0.0), v(0.125 * (s['waist'] if s['bust'] > 0 else W * 0.95), 0.1, 0.097 * s['belly'])), 'spine', 'belly', 0.05))
    if s['bust'] > 0:
        for side in (1, -1):
            P.append(('ell', (v(0.062 * side, cy + 0.015, 0.068), v(0.07 * s['bust'], 0.064 * s['bust'], 0.058 * s['bust'])), 'chest', 'chest', 0.03))
    else:
        # flat, broad chest
        P.append(('ell', (v(0, cy + 0.035, 0.012), v(0.15 * W, 0.12, 0.085)), 'chest', 'chest', 0.05))
    P.append(('cone', (v(-s['shoulder'] + 0.02, s['shoulderY'] - 0.005, -0.012), v(s['shoulder'] - 0.02, s['shoulderY'] - 0.005, -0.012), 0.058 * s['arm'], 0.058 * s['arm']), 'chest', 'chest', 0.04))
    # --- neck and head
    P.append(('cone', (v(0, ny - 0.07, -0.004), v(0, ny + 0.08, 0.008), s['neck'], s['neck'] * 0.92), 'neck', 'neck', 0.03))
    # Heads are drawn ~12% larger than life so faces read from the shop camera.
    H = 1.12
    hc = v(0, ny + 0.17 * H, 0.012)
    P.append(('ell', (hc, H * v(0.086, 0.108, 0.098)), 'head', 'head', 0.02))
    P.append(('ell', (hc + H * v(0, 0.02, -0.025), H * v(0.088, 0.1, 0.094)), 'head', 'head', 0.02))
    P.append(('ell', (hc + H * v(0, -0.06, 0.02), H * v(0.066 * s['jaw'], 0.058, 0.074)), 'head', 'head', 0.03))
    P.append(('ell', (hc + H * v(0, -0.014, 0.096), H * v(0.012, 0.02, 0.016)), 'head', 'head', 0.01))  # nose
    for side in (1, -1):
        P.append(('ell', (hc + H * v(0.086 * side, -0.01, -0.008), H * v(0.014, 0.026, 0.012)), 'head', 'head', 0.008))  # ears
        P.append(('ell', (hc + H * v(0.042 * side, -0.035, 0.07), H * v(0.026, 0.018, 0.02)), 'head', 'head', 0.015))  # cheeks
    # --- limbs (left side, then mirrored)
    a = s['arm']
    lg = s['leg']
    for side, f in (('L', lambda x: x), ('R', mirror)):
        P.append(('cone', (f(j['sh']), f(j['elbow']), 0.047 * a, 0.037 * a), f'upperArm.{side}', 'upperArm', 0.012))
        P.append(('cone', (f(j['elbow']), f(j['wrist']), 0.036 * a, 0.026 * a), f'foreArm.{side}', 'foreArm', 0.01))
        hand_dir = (j['wrist'] - j['elbow']) / np.linalg.norm(j['wrist'] - j['elbow'])
        P.append(('ell', (f(j['wrist'] + hand_dir * 0.07), v(0.022, 0.072, 0.042)), f'hand.{side}', 'hand', 0.012))
        P.append(('ell', (f(j['wrist'] + hand_dir * 0.035 + v(-0.005, 0, 0.03)), v(0.015, 0.035, 0.015)), f'hand.{side}', 'hand', 0.01))  # thumb
        P.append(('cone', (f(j['hip'] + v(-0.005, 0.03, 0)), f(j['knee']), 0.084 * lg * s['thigh'], 0.052 * lg), f'upperLeg.{side}', 'thigh', 0.012))
        P.append(('cone', (f(j['knee']), f(j['ankle']), 0.05 * lg, 0.033 * lg), f'lowerLeg.{side}', 'shin', 0.012))
        P.append(('ell', (f(v(j['knee'][0], (j['knee'][1] + j['ankle'][1]) / 2 + 0.1, -0.022)), v(0.048 * lg, 0.11, 0.05 * lg)), f'lowerLeg.{side}', 'shin', 0.03))  # calf
        P.append(('cone', (f(j['ankle'] + v(0, -0.028, -0.025)), f(v(j['ankle'][0], 0.032, 0.15)), 0.042, 0.03), f'foot.{side}', 'foot', 0.012))
        P.append(('ell', (f(v(j['ankle'][0], 0.03, 0.05)), v(0.045, 0.03, 0.1)), f'foot.{side}', 'foot', 0.012))
    return P


def hc_of(spec):
    return v(0, spec['neckY'] + 0.17 * 1.12, 0.012)


def evaluate(P, pts):
    d = None
    each = []
    for kind, args, bone, part, k in P:
        di = sd_ellipsoid(pts, *args) if kind == 'ell' else sd_round_cone(pts, *args)
        each.append(di)
        d = di if d is None else smin(d, di, k)
    return d, each


SPECS = {
    'woman': dict(hipY=0.95, chestY=1.24, neckY=1.43, shoulderY=1.385, shoulder=0.17, armOut=17, upperArm=0.27, foreArm=0.24,
                  hipX=0.094, kneeY=0.515, width=1.0, hips=1.0, seat=1.0, waist=0.92, belly=0.95, bust=1.0, neck=0.046, jaw=0.95,
                  arm=1.0, leg=1.0, thigh=1.0),
    'womanCurvy': dict(hipY=0.95, chestY=1.24, neckY=1.43, shoulderY=1.385, shoulder=0.18, armOut=19, upperArm=0.27, foreArm=0.24,
                       hipX=0.1, kneeY=0.515, width=1.1, hips=1.22, seat=1.3, waist=1.12, belly=1.15, bust=1.3, neck=0.05, jaw=1.0,
                       arm=1.22, leg=1.18, thigh=1.08),
    'man': dict(hipY=0.98, chestY=1.29, neckY=1.5, shoulderY=1.45, shoulder=0.205, armOut=15, upperArm=0.29, foreArm=0.26,
                hipX=0.092, kneeY=0.53, width=1.17, hips=0.92, seat=0.85, waist=1.08, belly=1.0, bust=0, neck=0.058, jaw=1.12,
                arm=1.15, leg=1.08, thigh=0.96),
}


def build(name, spec, target_faces, suffix=''):
    bones, joints = skeleton(spec)
    P = primitives(spec, joints)
    res = 0.009
    lo = v(-0.45, -0.01, -0.22)
    hi = v(0.45, 1.9, 0.26)
    nx, ny, nz = ((hi - lo) / res).astype(int) + 1
    xs = np.linspace(lo[0], hi[0], nx)
    ys = np.linspace(lo[1], hi[1], ny)
    zs = np.linspace(lo[2], hi[2], nz)
    vol = np.empty((nx, ny, nz), dtype=np.float32)
    for i, x in enumerate(xs):
        g = np.stack(np.meshgrid(np.array([x]), ys, zs, indexing='ij'), -1).reshape(-1, 3)
        d, _ = evaluate(P, g)
        vol[i] = d.reshape(ny, nz)
    verts, faces, _, _ = measure.marching_cubes(vol, 0.0, spacing=(res, res, res))
    verts = verts + lo
    # skimage's winding already faces outward for a distance field that is negative inside
    print(f'{name}: marching cubes {len(verts)} verts {len(faces)} faces', file=sys.stderr)
    verts, faces = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), target_reduction=1 - target_faces / len(faces))
    verts = verts.astype(np.float64)
    print(f'{name}: simplified to {len(verts)} verts {len(faces)} faces', file=sys.stderr)

    # --- skin weights: nearest body shapes, blended near joints
    _, each = evaluate(P, verts)
    each = np.stack(each, -1)  # (n, prims)
    bone_names = [b[0] for b in bones]
    bidx = {b: i for i, b in enumerate(bone_names)}
    prim_bone = np.array([bidx[p[2]] for p in P])
    prim_part = np.array([PART[p[3]] for p in P])
    n = len(verts)
    per_bone = np.full((n, len(bones)), 9.0)
    for pi in range(len(P)):
        b = prim_bone[pi]
        per_bone[:, b] = np.minimum(per_bone[:, b], each[:, pi])
    dmin = per_bone.min(1, keepdims=True)
    w = np.exp(-(per_bone - dmin) / 0.012)
    w[per_bone - dmin > 0.05] = 0
    # Limbs never pull the far side of the body: drop weights of bones on the other side.
    order = np.argsort(-w, axis=1)[:, :4]
    top = np.take_along_axis(w, order, 1)
    top = top / top.sum(1, keepdims=True)
    q = np.round(top * 255).astype(np.int32)
    q[:, 0] += 255 - q.sum(1)  # exact sums for clean skinning
    part = prim_part[np.argmin(each, 1)]

    # Smooth clothing masks for the game's outfit shader: region flags per vertex (arm, leg,
    # head/neck, hand/foot) and how far along the limb the vertex is (0 at the root, 1 at the
    # wrist/ankle). Separate flags interpolate cleanly, so sleeve and trouser edges stay crisp.
    arm = np.isin(part, [PART['upperArm'], PART['foreArm'], PART['hand']])
    leg = np.isin(part, [PART['thigh'], PART['shin'], PART['foot']])
    # Soft region weights from how close each region's shapes are: the 0.5 line between two
    # regions then runs smoothly along the crease instead of zig-zagging along triangle edges.
    def region_dist(parts):
        cols = [i for i, p in enumerate(P) if PART[p[3]] in parts]
        return each[:, cols].min(1)
    d_arm = region_dist([PART['upperArm'], PART['foreArm'], PART['hand']])
    d_leg = region_dist([PART['thigh'], PART['shin'], PART['foot']])
    d_head = region_dist([PART['head'], PART['neck']])
    d_trunk = region_dist([PART['chest'], PART['belly'], PART['pelvis']])
    d_ext = region_dist([PART['hand'], PART['foot']])
    d_limb = np.minimum(d_arm, d_leg)
    tau = 0.006
    def soft(d_in, d_out):
        return 1 / (1 + np.exp(np.clip((d_in - d_out) / tau, -40, 40)))
    region = np.zeros((n, 4), np.float32)
    region[:, 0] = soft(d_arm, np.minimum.reduce([d_trunk, d_leg, d_head]))
    region[:, 1] = soft(d_leg, np.minimum.reduce([d_trunk, d_arm, d_head]))
    region[:, 2] = soft(d_head, np.minimum.reduce([d_trunk, d_arm, d_leg]))
    others = np.where(arm, np.minimum(region_dist([PART['upperArm'], PART['foreArm']]), d_trunk), np.minimum(region_dist([PART['thigh'], PART['shin']]), d_trunk))
    region[:, 3] = soft(d_ext, others)
    along = np.zeros(n, np.float32)

    def chain(points, mask):
        segs = list(zip(points[:-1], points[1:]))
        total = sum(np.linalg.norm(b - a) for a, b in segs)
        best = np.full(mask.sum(), 9.0)
        val = np.zeros(mask.sum())
        acc = 0.0
        pv = verts[mask]
        for a, b in segs:
            ab = b - a
            L = np.linalg.norm(ab)
            tt = np.clip(((pv - a) @ ab) / (L * L), 0, 1)
            d = np.linalg.norm(pv - (a + tt[:, None] * ab), axis=1)
            better = d < best
            best[better] = d[better]
            val[better] = (acc + tt[better] * L) / total
            acc += L
        along[mask] = val

    for sgn in (1, -1):
        f = (lambda x: x) if sgn > 0 else mirror
        side = verts[:, 0] * sgn > 0
        chain([f(joints['sh']), f(joints['elbow']), f(joints['wrist'])], (region[:, 0] > 0.02) & side)
        chain([f(joints['hip']), f(joints['knee']), f(joints['ankle'])], (region[:, 1] > 0.02) & side)

    # Exact smooth normals from the distance field's gradient: soft shading even on a light mesh.
    e = 0.002
    grad = np.zeros_like(verts)
    for ax in range(3):
        dv = np.zeros(3); dv[ax] = e
        grad[:, ax] = evaluate(P, verts + dv)[0] - evaluate(P, verts - dv)[0]
    nrm = grad / (np.linalg.norm(grad, axis=1, keepdims=True) + 1e-12)

    pos = verts.astype(np.float32)
    data = {
        'name': name,
        'bones': [{'name': b, 'parent': p, 'pos': [round(float(x), 4) for x in h]} for b, p, h in bones],
        'count': int(n),
        'position': base64.b64encode(pos.tobytes()).decode(),
        'normal': base64.b64encode(np.round(nrm * 127).astype(np.int8).tobytes()).decode(),
        'index': base64.b64encode(faces.astype(np.uint16 if n < 65536 else np.uint32).tobytes()).decode(),
        'skinIndex': base64.b64encode(order.astype(np.uint8).tobytes()).decode(),
        'skinWeight': base64.b64encode(q.astype(np.uint8).tobytes()).decode(),
        'part': base64.b64encode(part.astype(np.uint8).tobytes()).decode(),
        'region': base64.b64encode((region * 255).astype(np.uint8).tobytes()).decode(),
        'along': base64.b64encode((np.clip(along, 0, 1) * 255).astype(np.uint8).tobytes()).decode(),
        'joints': {k: [round(float(x), 4) for x in val] for k, val in joints.items()},
        'spec': spec,
        'headCenter': [round(float(x), 4) for x in hc_of(spec)],
        'headScale': 1.12,
    }
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}{suffix}.json')
    with open(path, 'w') as fh:
        json.dump(data, fh, separators=(',', ':'))
    print(f'{name}: wrote {path} ({os.path.getsize(path) // 1024} KB)', file=sys.stderr)


if __name__ == '__main__':
    # Full detail, and a light version for mid-range phones.
    for suffix, faces in (('', 7000), ('-lo', 2600)):
        for name, spec in SPECS.items():
            build(name, spec, faces, suffix)
