import { describe, expect, it } from "vitest";
import { completenessLabel, missingTypes, nudgeLine, readySummary } from "./content";

describe("missingTypes", () => {
  it("empty module is missing all four", () => {
    expect(missingTypes({})).toEqual(["video", "slides", "exercises", "solutions"]);
  });

  it("complete module is missing nothing", () => {
    expect(missingTypes({ video: 2, slides: 1, exercises: 1, solutions: 1 })).toEqual([]);
  });

  it("zero counts count as missing", () => {
    expect(missingTypes({ video: 0, slides: 1, exercises: 1, solutions: 1 })).toEqual(["video"]);
  });
});

describe("completenessLabel", () => {
  it("all four present reads Complete", () => {
    expect(completenessLabel({ video: 1, slides: 1, exercises: 1, solutions: 1 })).toBe("Complete");
  });

  it("nothing uploaded reads Empty", () => {
    expect(completenessLabel({})).toBe("Empty");
  });

  it("one gap names it, mockup style", () => {
    expect(completenessLabel({ video: 2, slides: 1, exercises: 1 })).toBe("Solutions missing");
  });

  it("two gaps join with and", () => {
    expect(completenessLabel({ video: 1, slides: 1 })).toBe("Exercises and solutions missing");
  });

  it("three gaps use a comma then and", () => {
    expect(completenessLabel({ video: 1 })).toBe("Slides, exercises and solutions missing");
  });
});

describe("nudgeLine", () => {
  it("one missing type, the mockup sentence", () => {
    expect(nudgeLine(7, "Chemistry HL 2027", ["solutions"])).toBe(
      "Week 7 of Chemistry HL 2027 is missing its solutions",
    );
  });

  it("several missing types join with and", () => {
    expect(nudgeLine(8, "Chemistry HL 2027", ["video", "slides"])).toBe(
      "Week 8 of Chemistry HL 2027 is missing its videos and slides",
    );
  });
});

describe("readySummary", () => {
  it("nothing missing: the week is ready", () => {
    expect(readySummary(7, [])).toEqual({
      lead: "Week 7 is ready.",
      rest: "It releases itself on the release day.",
    });
  });

  it("one missing: the mockup sentence", () => {
    expect(readySummary(7, ["solutions"])).toEqual({
      lead: "One item left.",
      rest: "Add the solutions and week 7 is ready to release itself.",
    });
  });

  it("several missing: counts the items", () => {
    expect(readySummary(8, ["video", "slides", "solutions"])).toEqual({
      lead: "3 items left.",
      rest: "Fill the slots and week 8 is ready to release itself.",
    });
  });
});
