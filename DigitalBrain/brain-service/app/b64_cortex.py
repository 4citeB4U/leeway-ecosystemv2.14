"""b64_cortex.py — Base64 Cortical Coordinate Fabric (DB-00 substrate).

Deterministic six-bit spatial coordinate fabric for the Digital Brain.

Canonical identities (frozen by the canonical MJS codecs; the Python here is a
verified mirror — see tests/formula_v1_integrity.py and the q69 golden table
fixture generated from the canonical q69-codec.mjs):

  Base64 index    0..63                          (spatial pin, S = x + 4y + 16z)
  Base64 symbol   RFC4648 alphabet A..Z a..z 0..9 + /   (canonical alphabet)
  6-bit word      b5 b4 b3 b2 b1 b0  (index = int(bits, 2))
  local lattice   x=(b1b0), y=(b3b2), z=(b5b4);  x,y,z in {0,1,2,3}; 4x4x4=64
  hemisphere      L:<path> / R:<path>  (mirror transform: x -> 3-x)
  recursive path  L:G:q:B  ->  words ['G','q','B']; binaryPath '000110.101010.000001'

Q69 operational codec (mirror of inference/v1/q69-codec.mjs):
  q69FromPressure rho -> clip(0,69, roundHalfUp(69*rho))   (Math.round semantics)
  b64(q), qb64Fixed(q) = b64 right-justified 2 chars 'A'-padded, binary12(q)

SPATIAL ADDRESS = WHERE the object belongs. Q69/QB64 = CONDITION.
Render coordinates are DERIVED from b64Path; never the identity.
"""
import json
import math
import os

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
ALPHABET_INDEX = {c: i for i, c in enumerate(ALPHABET)}
Q69_MIN = 0
Q69_MAX = 69
Q69_SIZE = 70

_HEMI = {"L", "R"}


class B64Error(ValueError):
    pass


def encode(index):
    """Non-negative int -> positional base-64 (canonical codec semantics).

    0..63 -> single symbol; 64..69 -> two symbols (BA..BF). No leading zeros.
    """
    if not isinstance(index, int) or index < 0:
        raise B64Error(f"B64_ENCODE_NON_NEGATIVE_INTEGER_REQUIRED:{index}")
    if index == 0:
        return "A"
    out = ""
    v = index
    while v > 0:
        out = ALPHABET[v % 64] + out
        v //= 64
    return out


def decode(symbol):
    """Base64 string -> int (positional, canonical codec semantics)."""
    if not isinstance(symbol, str) or not symbol:
        raise B64Error(f"B64_DECODE_STRING_REQUIRED:{symbol}")
    v = 0
    for ch in symbol:
        if ch not in ALPHABET_INDEX:
            raise B64Error(f"B64_DECODE_INVALID_CHARACTER:{ch}")
        v = v * 64 + ALPHABET_INDEX[ch]
    return v


def to_bits(index):
    """index -> six-bit word 'b5..b0'."""
    if not isinstance(index, int) or index < 0 or index > 63:
        raise B64Error(f"B64_INDEX_OUT_OF_RANGE:{index}")
    return f"{index:06b}"


def from_bits(bits):
    """six-bit word -> index."""
    if not isinstance(bits, str) or len(bits) != 6 or any(c not in "01" for c in bits):
        raise B64Error(f"B64_BITS_INVALID:{bits}")
    return int(bits, 2)


def to_xyz(index):
    """index -> (x, y, z); x=(b1b0), y=(b3b2), z=(b5b4)."""
    if not isinstance(index, int) or index < 0 or index > 63:
        raise B64Error(f"B64_INDEX_OUT_OF_RANGE:{index}")
    return (index & 3, (index >> 2) & 3, (index >> 4) & 3)


def from_xyz(x, y, z):
    """(x,y,z) in {0..3} -> index; S = x + 4y + 16z."""
    for v in (x, y, z):
        if not isinstance(v, int) or v < 0 or v > 3:
            raise B64Error(f"B64_XYZ_OUT_OF_RANGE:{x},{y},{z}")
    return x + 4 * y + 16 * z


def mirror_index(index):
    """Hemisphere mirror: x -> 3-x on the mirrored side."""
    x, y, z = to_xyz(index)
    return from_xyz(3 - x, y, z)


def all_coordinates():
    """All 64 (index, symbol, bits, xyz) tuples, deterministic order 0..63."""
    return [
        (i, encode(i), to_bits(i), to_xyz(i))
        for i in range(64)
    ]


def validate_round_trip():
    """Exhaustive 64-way round trips. Returns list of failures (empty = pass)."""
    fails = []
    for i in range(64):
        if decode(encode(i)) != i:
            fails.append(f"encode/decode roundtrip {i}")
        x, y, z = to_xyz(i)
        if from_xyz(x, y, z) != i:
            fails.append(f"xyz roundtrip {i}")
        if to_bits(from_bits(to_bits(i))) != to_bits(i):
            fails.append(f"bits roundtrip {i}")
        if from_bits(to_bits(i)) != i:
            fails.append(f"bits/index roundtrip {i}")
    return fails


def mirror_check():
    """Every mirrored pair keeps y,z and flips x. Returns failures (empty = pass)."""
    fails = []
    for i in range(64):
        m = mirror_index(i)
        if m == i and to_xyz(i)[0] != 1:
            fails.append(f"mirror fixed-point unexpected {i}")
        x, y, z = to_xyz(i)
        mx, my, mz = to_xyz(m)
        if my != y or mz != z or mx != 3 - x:
            fails.append(f"mirror mapping {i}")
        if mirror_index(m) != i:
            fails.append(f"mirror involution {i}")
    return fails


# ---------------------------------------------------------------- Q69 codec
def _math_round_half_up(v):
    """Replicates ECMAScript Math.round (half away from zero for positives)."""
    return math.floor(v + 0.5)


def q69_from_pressure(rho):
    if not isinstance(rho, (int, float)) or not math.isfinite(rho):
        raise B64Error("Q69_PRESSURE_REQUIRED")
    rho = max(0.0, min(1.0, float(rho)))
    return min(Q69_MAX, max(Q69_MIN, _math_round_half_up(69.0 * rho)))


def assert_q69(q):
    if not isinstance(q, int) or q < Q69_MIN or q > Q69_MAX:
        raise B64Error(f"Q69_OUT_OF_RANGE:{q}")


def b64(q):
    assert_q69(q)
    return encode(q)


def qb64_fixed(q):
    assert_q69(q)
    return encode(q).rjust(2, "A")


def binary12(q):
    assert_q69(q)
    return f"{q:012b}"


def decode_qb64(s):
    if not isinstance(s, str) or len(s) < 1 or len(s) > 2:
        raise B64Error(f"QB64_INVALID:{s}")
    v = decode(s[-1])
    assert_q69(v)
    return v


def golden_q69_table():
    return [
        {"q": q, "b64": b64(q), "qb64": qb64_fixed(q), "binary12": binary12(q)}
        for q in range(Q69_SIZE)
    ]


def verify_q69_golden_table():
    """Compare this mirror against the canonical-generated fixture file."""
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.normpath(os.path.join(here, "..", "fixtures", "q69_golden_table.json")),
        "/app/fixtures/q69_golden_table.json",
        "/leeway-root/DigitalBrain/brain-service/fixtures/q69_golden_table.json",
        "/leeway-root/DigitalBrain/tests/fixtures/q69_golden_table.json",
    ]
    fixture = next((c for c in candidates if os.path.exists(c)), None)
    if fixture is None:
        return {"pass": False, "reason": f"FIXTURE_MISSING:{candidates[0]}"}
    with open(fixture, "r", encoding="utf-8") as f:
        canonical = json.load(f)
    mine = golden_q69_table()
    mismatches = [row for a, b in zip(canonical, mine) if a != b]
    if len(mismatches) or len(canonical) != Q69_SIZE:
        return {"pass": False, "reason": f"MISMATCH_COUNT:{len(mismatches)}"}
    return {"pass": True, "reason": None, "entries": Q69_SIZE}


# ---------------------------------------------------------------- recursive paths
def encode_path(hemi, words):
    if hemi not in _HEMI:
        raise B64Error(f"HEMI_INVALID:{hemi}")
    if not isinstance(words, list) or not words:
        raise B64Error("B64_PATH_EMPTY")
    for w in words:
        _spatial_word(w)
    return f"{hemi}:" + ":".join(words)


def _spatial_word(word):
    """A recursive-path word must be a single six-bit spatial symbol (0..63)."""
    if not isinstance(word, str) or len(word) != 1 or word not in ALPHABET_INDEX:
        raise B64Error(f"B64_SPATIAL_WORD_INVALID:{word}")


def decode_path(path):
    """L:G:q:B -> (hemi, [indices], [words], [bits])."""
    if not isinstance(path, str):
        raise B64Error("B64_PATH_INVALID")
    parts = path.split(":")
    if len(parts) < 2 or parts[0] not in _HEMI:
        raise B64Error(f"B64_PATH_INVALID:{path}")
    words = parts[1:]
    for w in words:
        _spatial_word(w)
    indices = [decode(w) for w in words]
    bits = [to_bits(i) for i in indices]
    return {"hemi": parts[0], "words": words, "indices": indices,
            "bits": bits, "binaryPath": ".".join(bits)}


def local_coordinate(word):
    """Single spatial word -> (index, bits, xyz)."""
    _spatial_word(word)
    i = decode(word)
    return {"index": i, "bits": to_bits(i), "xyz": to_xyz(i)}


def self_test():
    """Full module self-test. Returns dict {pass, failures, checks}."""
    rt = validate_round_trip()
    mc = mirror_check()
    q69 = verify_q69_golden_table()
    failures = [f"roundtrip:{x}" for x in rt] + [f"mirror:{x}" for x in mc]
    if not q69["pass"]:
        failures.append(f"q69:{q69.get('reason')}")
    return {
        "pass": not failures,
        "failures": failures,
        "checks": {"roundtrip": 64, "mirror": 64, "q69Golden": q69},
    }
