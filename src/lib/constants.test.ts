import { describe, it, expect } from "vitest";
import { STAGES, STAGE_CONFIG, STAGE_TRANSITIONS } from "./constants";

describe("STAGE_CONFIG", () => {
  it("has a config entry for every stage", () => {
    for (const stage of STAGES) {
      expect(STAGE_CONFIG[stage]).toBeDefined();
      expect(STAGE_CONFIG[stage].labelKey).toBeTruthy();
      expect(STAGE_CONFIG[stage].color).toBeTruthy();
      expect(STAGE_CONFIG[stage].bgColor).toBeTruthy();
    }
  });

  it("has exactly 4 stages", () => {
    expect(STAGES).toHaveLength(4);
  });
});

describe("STAGE_TRANSITIONS", () => {
  it("has transitions for every stage", () => {
    for (const stage of STAGES) {
      expect(STAGE_TRANSITIONS[stage]).toBeDefined();
      expect(Array.isArray(STAGE_TRANSITIONS[stage])).toBe(true);
      expect(STAGE_TRANSITIONS[stage].length).toBeGreaterThan(0);
    }
  });

  it("all transition targets are valid stages", () => {
    const validStages = new Set<string>(STAGES);
    for (const stage of STAGES) {
      for (const transition of STAGE_TRANSITIONS[stage]) {
        expect(validStages.has(transition.next)).toBe(true);
      }
    }
  });

  it("all transitions have a labelKey", () => {
    for (const stage of STAGES) {
      for (const transition of STAGE_TRANSITIONS[stage]) {
        expect(transition.labelKey).toBeTruthy();
      }
    }
  });

  it("no stage transitions to itself", () => {
    for (const stage of STAGES) {
      for (const transition of STAGE_TRANSITIONS[stage]) {
        expect(transition.next).not.toBe(stage);
      }
    }
  });
});
