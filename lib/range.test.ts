import { describe, expect, it } from "vitest";
import { parseRangeHeader, unsatisfiableContentRange } from "./range";

const SIZE = 1000;

describe("parseRangeHeader: no header", () => {
  it("absent header serves the whole object", () => {
    expect(parseRangeHeader(null, SIZE)).toEqual({ kind: "full" });
    expect(parseRangeHeader(undefined, SIZE)).toEqual({ kind: "full" });
  });

  it("blank header serves the whole object", () => {
    expect(parseRangeHeader("   ", SIZE)).toEqual({ kind: "full" });
  });
});

describe("parseRangeHeader: the ranges a player actually sends", () => {
  it("bytes=0- opens the file", () => {
    expect(parseRangeHeader("bytes=0-", SIZE)).toEqual({ kind: "slice", start: 0, end: 999 });
  });

  it("a closed range is inclusive of both ends", () => {
    expect(parseRangeHeader("bytes=100-199", SIZE)).toEqual({ kind: "slice", start: 100, end: 199 });
  });

  it("a single byte is a valid range", () => {
    expect(parseRangeHeader("bytes=0-0", SIZE)).toEqual({ kind: "slice", start: 0, end: 0 });
  });

  it("an end past the object is clamped, not refused", () => {
    expect(parseRangeHeader("bytes=900-99999", SIZE)).toEqual({ kind: "slice", start: 900, end: 999 });
  });

  it("a suffix range reads the tail (the moov atom probe)", () => {
    expect(parseRangeHeader("bytes=-256", SIZE)).toEqual({ kind: "slice", start: 744, end: 999 });
  });

  it("a suffix longer than the object is the whole object", () => {
    expect(parseRangeHeader("bytes=-99999", SIZE)).toEqual({ kind: "slice", start: 0, end: 999 });
  });

  it("the unit and the surrounding whitespace are forgiven", () => {
    expect(parseRangeHeader("  BYTES= 10 - 20 ", SIZE)).toEqual({ kind: "slice", start: 10, end: 20 });
  });
});

describe("parseRangeHeader: unsatisfiable and malformed both refuse", () => {
  const refused = [
    ["a start past the end", "bytes=1000-1200"],
    ["a start far past the end", "bytes=99999-"],
    ["an end before the start", "bytes=500-499"],
    ["junk instead of numbers", "bytes=abc-def"],
    ["a negative-looking start", "bytes=--5"],
    ["a float start", "bytes=1.5-9"],
    ["the wrong unit", "items=0-99"],
    ["no unit at all", "0-99"],
    ["no dash", "bytes=100"],
    ["nothing after bytes=", "bytes="],
    ["an empty range on both sides", "bytes=-"],
    ["a zero-length suffix", "bytes=-0"],
    ["a multi-range request", "bytes=0-99,200-299"],
    ["a start beyond Number.MAX_SAFE_INTEGER", "bytes=99999999999999999999-"],
  ] as const;

  for (const [label, header] of refused) {
    it(`refuses ${label}: ${header}`, () => {
      expect(parseRangeHeader(header, SIZE)).toEqual({ kind: "unsatisfiable" });
    });
  }

  it("a zero-length object cannot satisfy any range", () => {
    expect(parseRangeHeader("bytes=0-", 0)).toEqual({ kind: "unsatisfiable" });
    expect(parseRangeHeader("bytes=0-0", 0)).toEqual({ kind: "unsatisfiable" });
    expect(parseRangeHeader("bytes=-10", 0)).toEqual({ kind: "unsatisfiable" });
  });

  it("a zero-length object with no Range header is still a plain 200", () => {
    expect(parseRangeHeader(null, 0)).toEqual({ kind: "full" });
  });
});

describe("unsatisfiableContentRange", () => {
  it("names the true size so the client can retry correctly", () => {
    expect(unsatisfiableContentRange(SIZE)).toBe("bytes */1000");
    expect(unsatisfiableContentRange(0)).toBe("bytes */0");
  });
});
