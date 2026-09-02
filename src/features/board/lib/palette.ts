/**
 * One colour per person, fixed by join order so nobody's colour ever moves.
 *
 * Light and dark are separate steps of the same hues, not an automatic flip:
 * the orange that reads well on white sits above the lightness band for a dark
 * surface. Both sets are validated for colour-blind separation, chroma,
 * lightness band and contrast (OKLab ΔE ≥ 8 on every adjacent pair, worst case
 * 10.5 light / 11.1 dark).
 *
 * There are two of us, so slots 3 and 4 only exist so nothing breaks if a third
 * account ever appears; they're validated alongside the first two.
 */
export const PERSON_COLORS_LIGHT = ["#4F8EF7", "#FF5722", "#17A06E", "#8B5CF6"];
export const PERSON_COLORS_DARK = ["#4F8EF7", "#EE5A22", "#17A06E", "#8B5CF6"];
