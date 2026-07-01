// Randomness helpers. Everything that needs randomness takes an `rng` function
// (returning a float in [0, 1), like Math.random) so tests can pass a seeded
// generator and get reproducible puzzles.

// mulberry32: tiny, fast, seedable PRNG. Quality is plenty for puzzle
// generation (we are not doing cryptography or statistics).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

// Fisher-Yates, in place. Returns the array for convenience.
export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function choice(arr, rng) {
  return arr[randInt(rng, arr.length)];
}

// items: array of values; weights: parallel array of non-negative numbers.
export function weightedChoice(items, weights, rng) {
  let total = 0;
  for (const w of weights) total += w;
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}
