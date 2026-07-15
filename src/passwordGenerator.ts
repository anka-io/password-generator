export type CharacterClass = "lowercase" | "uppercase" | "digits" | "symbols";

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export type RandomValuesProvider = (values: Uint32Array) => Uint32Array;

export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 200;

export const CHROME_DEFAULT_OPTIONS: Readonly<PasswordOptions> = Object.freeze({
  length: 15,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: false,
  excludeAmbiguous: true,
});

export const CHARACTER_SETS = Object.freeze({
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "-_.:!",
});

export const CHROME_SAFE_CHARACTER_SETS = Object.freeze({
  lowercase: "abcdefghijkmnpqrstuvwxyz",
  uppercase: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  digits: "23456789",
  symbols: CHARACTER_SETS.symbols,
});

const UINT32_RANGE = 0x1_0000_0000;

const browserRandomValues: RandomValuesProvider = (values) => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random number generation is unavailable.");
  }
  return globalThis.crypto.getRandomValues(values);
};

export function secureRandomInt(
  maxExclusive: number,
  randomValues: RandomValuesProvider = browserRandomValues,
): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
    throw new RangeError("maxExclusive must be an integer between 1 and 2^32.");
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const buffer = new Uint32Array(1);

  do {
    randomValues(buffer);
  } while (buffer[0] >= limit);

  return buffer[0] % maxExclusive;
}

export function shuffleInPlace<T>(
  values: T[],
  randomValues: RandomValuesProvider = browserRandomValues,
): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1, randomValues);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function enabledCharacterSets(options: PasswordOptions): string[] {
  const sets = options.excludeAmbiguous ? CHROME_SAFE_CHARACTER_SETS : CHARACTER_SETS;
  return (Object.keys(sets) as CharacterClass[])
    .filter((characterClass) => options[characterClass])
    .map((characterClass) => sets[characterClass]);
}

export function validatePasswordOptions(options: PasswordOptions): void {
  if (
    !Number.isInteger(options.length) ||
    options.length < MIN_PASSWORD_LENGTH ||
    options.length > MAX_PASSWORD_LENGTH
  ) {
    throw new RangeError(
      `Password length must be an integer between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}.`,
    );
  }

  const classCount = enabledCharacterSets(options).length;
  if (classCount === 0) {
    throw new RangeError("At least one character class must be enabled.");
  }
  if (classCount > options.length) {
    throw new RangeError("Password length cannot be shorter than the enabled character class count.");
  }
}

function isDifficultToRead(password: string): boolean {
  return password.includes("--") || password.includes("__");
}

export function generatePassword(
  options: PasswordOptions,
  randomValues: RandomValuesProvider = browserRandomValues,
): string {
  validatePasswordOptions(options);

  const characterSets = enabledCharacterSets(options);
  const allCharacters = characterSets.join("");
  const password = characterSets.map(
    (characters) => characters[secureRandomInt(characters.length, randomValues)],
  );

  while (password.length < options.length) {
    password.push(allCharacters[secureRandomInt(allCharacters.length, randomValues)]);
  }

  // Chromium retries a few times when adjacent dashes or underscores form long strokes.
  let remainingRetries = 5;
  do {
    shuffleInPlace(password, randomValues);
  } while (isDifficultToRead(password.join("")) && remainingRetries-- > 0);

  return password.join("");
}
