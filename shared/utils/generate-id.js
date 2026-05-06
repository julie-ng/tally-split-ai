import { customAlphabet } from 'nanoid'

/**
 * Generate an opaque public ID for any user-facing resource (households,
 * users, uploads, receipts, splits). 18 chars from a 36-char effective
 * alphabet (lowercase + digits) → ~93 bits of entropy.
 *
 * The alphabet is biased toward letters by doubling all letters EXCEPT
 * l/m/n/o (visually similar to each other and to digits). Letters appear
 * roughly 2x as often as digits in output, but unique character count
 * stays at 36 so collision math is unaffected.
 */
const DOUBLED = 'aabbccddeeffgghhiijjkkppqqrrssttuuvvwwxxyyzz'
const SINGLES = 'lmno'
const DIGITS = '0123456789'
const ALPHABET = DOUBLED + SINGLES + DIGITS

const ID_LENGTH = 18

export const generateId = customAlphabet(ALPHABET, ID_LENGTH)
