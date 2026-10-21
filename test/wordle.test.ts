import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Step 1: a generator for five-letter uppercase words.
const wordFrom = (letters: string) => 
  fc.array(fc.constantFrom(...letters), { minLength: 5, maxLength: 5 }).map(cs => cs.join(''));
const word = wordFrom(ALPHABET);

describe('matchGuess', () => {
  // Pattern: invariant. The result will always have exactly five colors.
  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess)).toHaveLength(5);
      }),
    );
  });

  // Pattern: invariant. The result will always only use the colors green, yellow and black.
  it('only uses the colors G, Y, B', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
      }),
    );
  });

  // Pattern: conditional. If the word is correct, it should be all greens
  it('guessing the secret gives all greens', () => {
    fc.assert(
      fc.property(word, (secret) => {
        expect(matchGuess(secret, secret)).toEqual(['G', 'G', 'G', 'G', 'G']);
      }),
    );
  });

  // Pattern: invariant. For each letter that exists, it will always have less credited 
  // letters in the final result.
  it('never credits a letter more times than the secret contains it', () => {
    // Targeted generator: the guess draws its letters from the secret (with
    // repeats), so greens and extra copies of the secret's letters are common.
    const secretAndGuess = word.chain(secret =>
      wordFrom(secret).map(guess => [secret, guess] as const),
    );
    fc.assert(
      fc.property(secretAndGuess, ([secret, guess]) => {
        const result = matchGuess(secret, guess);
        for (const letter of new Set(guess)) {
          const credited = [...guess].filter((c, i) => c === letter && result[i] !== 'B').length;
          const inSecret = [...secret].filter(c => c === letter).length;
          expect(credited).toBeLessThanOrEqual(inSecret);
        }
      }),
    );
  });

  // Pattern: metamorphic. Replacing a black letter in the guess with a letter
  // that isn't in the secret doesn't change any color.
  it('replacing a black letter with an absent letter preserves the result', () => {
    // A small alphabet makes repeated letters common, so blacks caused by
    // already-used letters show up, not just letters missing from the secret.
    const smallWord = wordFrom('ABCDE');
    fc.assert(
      fc.property(smallWord, smallWord, fc.nat(), (secret, guess, pick) => {
        const absent = [...ALPHABET].filter(c => !secret.includes(c));
        const replacement = absent[pick % absent.length];
        const result = matchGuess(secret, guess);
        for (let i = 0; i < 5; i++) {
          if (result[i] !== 'B') continue;
          const changed = guess.slice(0, i) + replacement + guess.slice(i + 1);
          expect(matchGuess(secret, changed)).toEqual(result);
        }
      }),
    );
  });

  // Pattern: conditional. If the guess is a permutation of the secret, no position is black.
  it('a permutation of the secret has no blacks', () => {
    // Targeted generator: the guess is built by shuffling the secret's letters,
    // so every input satisfies the condition. The small alphabet makes
    // repeated letters common.
    const secretAndPermutation = wordFrom('ABCDE').chain(secret =>
      fc
        .shuffledSubarray([...secret], { minLength: 5, maxLength: 5 })
        .map(cs => [secret, cs.join('')] as const),
    );
    fc.assert(
      fc.property(secretAndPermutation, ([secret, guess]) => {
        expect(matchGuess(secret, guess)).not.toContain('B');
      }),
    );
  });
});
