/** Color theory basics for the Color tab (client-safe, brand-neutral). */

/** Hair levels 1–10 with the warmth that typically shows when hair is lightened to that level. */
export const LEVELS = [
  { level: 1, name: "Black", hex: "#1b1512", pigment: "Dark red / violet" },
  { level: 2, name: "Darkest brown", hex: "#2b1d17", pigment: "Red-violet" },
  { level: 3, name: "Dark brown", hex: "#3b271d", pigment: "Red" },
  { level: 4, name: "Medium brown", hex: "#4e3123", pigment: "Red-orange" },
  { level: 5, name: "Light brown", hex: "#66402b", pigment: "Red-orange" },
  { level: 6, name: "Dark blonde", hex: "#7f5534", pigment: "Orange" },
  { level: 7, name: "Medium blonde", hex: "#9c6e42", pigment: "Orange-gold" },
  { level: 8, name: "Light blonde", hex: "#bd9257", pigment: "Gold" },
  { level: 9, name: "Very light blonde", hex: "#d8b779", pigment: "Yellow" },
  {
    level: 10,
    name: "Lightest blonde",
    hex: "#ecd7a4",
    pigment: "Pale yellow",
  },
];

/** Tone families and what each one does (brand-neutral). */
export const TONE_FAMILIES = [
  {
    name: "Blue / ash",
    hex: "#5b7a9b",
    use: "Cancels orange and brassy warmth",
  },
  { name: "Violet", hex: "#7a5a9b", use: "Cancels yellow" },
  { name: "Green / matte", hex: "#6b7d4a", use: "Cancels red" },
  { name: "Gold", hex: "#d1a63a", use: "Adds warmth and shine" },
  { name: "Copper", hex: "#c66a2b", use: "Adds orange warmth" },
  { name: "Red", hex: "#b5262c", use: "Adds red" },
];

/** Color wheel (painter's / RYB wheel used for hair, makeup and tattoo pigment), clockwise from red. */
export const WHEEL = [
  { name: "Red", hex: "#d1262d", kind: "primary" },
  { name: "Red-orange", hex: "#e2512a", kind: "tertiary" },
  { name: "Orange", hex: "#ee7c22", kind: "secondary" },
  { name: "Yellow-orange", hex: "#f4a823", kind: "tertiary" },
  { name: "Yellow", hex: "#f4d43a", kind: "primary" },
  { name: "Yellow-green", hex: "#a5c33c", kind: "tertiary" },
  { name: "Green", hex: "#3c9a4a", kind: "secondary" },
  { name: "Blue-green", hex: "#25867f", kind: "tertiary" },
  { name: "Blue", hex: "#2b5ba8", kind: "primary" },
  { name: "Blue-violet", hex: "#4b4398", kind: "tertiary" },
  { name: "Violet", hex: "#6c3a8f", kind: "secondary" },
  { name: "Red-violet", hex: "#9c2f6b", kind: "tertiary" },
] as const;

/** The color straight across the wheel: it cancels (neutralizes) the one you pick. */
export function complementOf(index: number) {
  return WHEEL[(index + 6) % WHEEL.length];
}
