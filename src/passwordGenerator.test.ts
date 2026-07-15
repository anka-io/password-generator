import { describe, expect, it } from "vitest";
import {
  CHARACTER_SETS,
  CHROME_DEFAULT_OPTIONS,
  CHROME_SAFE_CHARACTER_SETS,
  generatePassword,
  secureRandomInt,
  shuffleInPlace,
  type PasswordOptions,
  type RandomValuesProvider,
} from "./passwordGenerator";

const sequenceProvider = (...values: number[]): RandomValuesProvider => {
  let index = 0;
  return (buffer) => {
    buffer[0] = values[index] ?? 0;
    index += 1;
    return buffer;
  };
};

describe("secureRandomInt", () => {
  it("rejects values outside the unbiased range", () => {
    const provider = sequenceProvider(0xffff_ffff, 7);
    expect(secureRandomInt(10, provider)).toBe(7);
  });

  it("validates its upper bound", () => {
    expect(() => secureRandomInt(0)).toThrow(RangeError);
  });
});

describe("shuffleInPlace", () => {
  it("uses the injected random source for Fisher-Yates swaps", () => {
    expect(shuffleInPlace(["a", "b", "c"], sequenceProvider(0, 0))).toEqual(["b", "c", "a"]);
  });
});

describe("generatePassword", () => {
  it("matches the Chromium default character and class rules", () => {
    const allowed = new RegExp(`^[${Object.values(CHROME_SAFE_CHARACTER_SETS).slice(0, 3).join("")}]+$`);
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const password = generatePassword({ ...CHROME_DEFAULT_OPTIONS });
      expect(password).toHaveLength(15);
      expect(password).toMatch(allowed);
      expect(password).toMatch(/[abcdefghijkmnpqrstuvwxyz]/);
      expect(password).toMatch(/[ABCDEFGHJKLMNPQRSTUVWXYZ]/);
      expect(password).toMatch(/[23456789]/);
      expect(password).not.toMatch(/[lI1O0o]/);
      expect(password).not.toMatch(/[-_.:!]/);
    }
  });

  it("supports all custom character classes", () => {
    const options: PasswordOptions = {
      length: 64,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: false,
    };
    const password = generatePassword(options);
    expect(password).toHaveLength(64);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[-_.:!]/);
    expect([...password].every((character) => Object.values(CHARACTER_SETS).join("").includes(character))).toBe(true);
  });

  it("handles minimum and maximum supported lengths", () => {
    const base = { ...CHROME_DEFAULT_OPTIONS };
    expect(generatePassword({ ...base, length: 4 })).toHaveLength(4);
    expect(generatePassword({ ...base, length: 200 })).toHaveLength(200);
  });

  it("rejects invalid lengths and empty character selections", () => {
    expect(() => generatePassword({ ...CHROME_DEFAULT_OPTIONS, length: 3 })).toThrow(RangeError);
    expect(() => generatePassword({ ...CHROME_DEFAULT_OPTIONS, length: 201 })).toThrow(RangeError);
    expect(() => generatePassword({
      ...CHROME_DEFAULT_OPTIONS,
      lowercase: false,
      uppercase: false,
      digits: false,
    })).toThrow(RangeError);
  });

  it("never falls back to Math.random when crypto is unavailable", () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    try {
      expect(() => generatePassword({ ...CHROME_DEFAULT_OPTIONS })).toThrow("Secure random number generation is unavailable");
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: originalCrypto, configurable: true });
    }
  });
});
