import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Recitation Part 2 (groups) and problem set Task 2.
// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

// Valid by construction: a start plus a non-negative length, so start <= end.
// A small range makes overlapping and touching intervals common.
const interval: fc.Arbitrary<Interval> = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.nat({ max: 10 }))
  .map(([start, len]) => [start, start + len]);
const intervalList = fc.array(interval);

// Targeted generator for already-disjoint input: each interval starts at least
// 1 past the previous end, so no two overlap or touch. Returns the intervals in
// sorted order alongside a shuffled copy to pass in.
const disjointList = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.array(fc.tuple(fc.nat({ max: 5 }), fc.nat({ max: 5 }))))
  .map(([first, steps]) => {
    const sorted: Interval[] = [];
    let next = first;
    for (const [len, gap] of steps) {
      sorted.push([next, next + len]);
      next += len + gap + 1;
    }
    return sorted;
  })
  .chain(sorted =>
    fc
      .shuffledSubarray(sorted, { minLength: sorted.length, maxLength: sorted.length })
      .map(shuffled => [sorted, shuffled] as const),
  );

// Helper oracle: is point p inside some interval of the list?
const covers = (xs: readonly Interval[], p: number) => xs.some(([s, e]) => s <= p && p <= e);

// Every integer and half-integer around the generated range. Endpoints are
// integers, so these points tell apart any two different coverages, including
// gaps like 2 < x < 3 between [1, 2] and [3, 4].
const points: number[] = [];
for (let p = -25; p <= 40; p += 0.5) points.push(p);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. The output is sorted, each interval has start <= end, and
  // consecutive intervals neither overlap nor touch.
  it('returns sorted, valid intervals with gaps between them', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (const [s, e] of out) expect(s).toBeLessThanOrEqual(e);
        for (let i = 0; i + 1 < out.length; i++) expect(out[i][1]).toBeLessThan(out[i + 1][0]);
      }),
    );
  });

  // Pattern: invariant. The input array and its intervals are not modified.
  it('does not modify its input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const copy = xs.map(([s, e]) => [s, e]);
        mergeIntervals(xs);
        expect(xs).toEqual(copy);
      }),
    );
  });

  // Pattern: differential. A point is covered by the output exactly when the
  // "is p covered?" oracle says it is covered by the input.
  it('covers exactly the same points as the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (const p of points) expect(covers(out, p)).toBe(covers(xs, p));
      }),
    );
  });

  // Pattern: algebraic. Merging is idempotent: merging the output again changes nothing.
  it('merging twice is the same as merging once', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        expect(mergeIntervals(once)).toEqual(once);
      }),
    );
  });

  // Pattern: algebraic. Merging part of the list first doesn't change the final result.
  it('merge(xs ++ ys) equals merge(merge(xs) ++ ys)', () => {
    fc.assert(
      fc.property(intervalList, intervalList, (xs, ys) => {
        expect(mergeIntervals([...mergeIntervals(xs), ...ys])).toEqual(mergeIntervals([...xs, ...ys]));
      }),
    );
  });

  // Pattern: metamorphic. Reordering the input or duplicating intervals in it
  // doesn't change the output.
  it('input order and duplicates do not matter', () => {
    // The variant is xs plus some repeated intervals from xs, shuffled.
    const listAndVariant = intervalList.chain(xs =>
      fc
        .subarray(xs)
        .chain(extras => fc.shuffledSubarray([...xs, ...extras], { minLength: xs.length + extras.length }))
        .map(ys => [xs, ys] as const),
    );
    fc.assert(
      fc.property(listAndVariant, ([xs, ys]) => {
        expect(mergeIntervals(ys)).toEqual(mergeIntervals(xs));
      }),
    );
  });

  // Pattern: conditional. If no two input intervals overlap or touch, the output
  // is the same intervals, sorted by start.
  it('already-disjoint input comes back sorted and unchanged', () => {
    fc.assert(
      fc.property(disjointList, ([sorted, shuffled]) => {
        expect(mergeIntervals(shuffled)).toEqual(sorted);
      }),
    );
  });

  // Pattern: conditional. If any interval has start > end, it throws a RangeError.
  it('rejects an interval whose start is after its end', () => {
    const backwards = fc
      .tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: 1, max: 10 }))
      .map(([end, len]): Interval => [end + len, end]);
    fc.assert(
      fc.property(intervalList, backwards, intervalList, (before, bad, after) => {
        expect(() => mergeIntervals([...before, bad, ...after])).toThrow(RangeError);
      }),
    );
  });

  it('gives [] for []', () => {
    expect(mergeIntervals([])).toEqual([]);
  });
});
