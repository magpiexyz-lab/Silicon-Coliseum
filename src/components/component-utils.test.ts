import { describe, it, expect } from "vitest";
import {
  formatCounterValue,
  getConfidenceColor,
  getHueFromSymbol,
  truncateAddress,
  getRiskLevelStyles,
  formatPnlValue,
} from "@/components/component-utils";

describe("formatCounterValue", () => {
  it("formats plain number with commas", () => {
    expect(formatCounterValue(1234567, "number", "", "")).toBe("1,234,567");
  });

  it("formats currency with $ prefix", () => {
    expect(formatCounterValue(1234.56, "currency", "", "")).toBe("$1,234.56");
  });

  it("formats percent with % suffix", () => {
    expect(formatCounterValue(85.5, "percent", "", "")).toBe("85.5%");
  });

  it("includes custom prefix and suffix", () => {
    expect(formatCounterValue(100, "number", "~", " items")).toBe(
      "~100 items"
    );
  });

  it("formats zero correctly", () => {
    expect(formatCounterValue(0, "number", "", "")).toBe("0");
  });

  it("formats decimal numbers for currency", () => {
    expect(formatCounterValue(0.5, "currency", "", "")).toBe("$0.50");
  });
});

describe("getConfidenceColor", () => {
  it("returns red class for 0-30%", () => {
    expect(getConfidenceColor(15)).toContain("red");
  });

  it("returns amber class for 31-60%", () => {
    expect(getConfidenceColor(45)).toContain("amber");
  });

  it("returns green class for 61-100%", () => {
    expect(getConfidenceColor(80)).toContain("green");
  });

  it("returns red class for 0%", () => {
    expect(getConfidenceColor(0)).toContain("red");
  });

  it("returns green class for 100%", () => {
    expect(getConfidenceColor(100)).toContain("green");
  });

  it("returns red class for exactly 30%", () => {
    expect(getConfidenceColor(30)).toContain("red");
  });

  it("returns amber class for exactly 60%", () => {
    expect(getConfidenceColor(60)).toContain("amber");
  });
});

describe("getHueFromSymbol", () => {
  it("returns a number between 0 and 360", () => {
    const hue = getHueFromSymbol("PEPE");
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it("returns consistent hue for same symbol", () => {
    expect(getHueFromSymbol("DOGE")).toBe(getHueFromSymbol("DOGE"));
  });

  it("returns different hues for different symbols", () => {
    expect(getHueFromSymbol("PEPE")).not.toBe(getHueFromSymbol("DOGE"));
  });
});

describe("truncateAddress", () => {
  it("truncates a full Ethereum address", () => {
    expect(truncateAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234...5678"
    );
  });

  it("handles short strings gracefully", () => {
    expect(truncateAddress("0x1234")).toBe("0x1234");
  });
});

describe("getRiskLevelStyles", () => {
  it("returns blue styles for conservative", () => {
    const styles = getRiskLevelStyles("conservative");
    expect(styles).toContain("blue");
  });

  it("returns green/emerald styles for balanced", () => {
    const styles = getRiskLevelStyles("balanced");
    expect(styles).toMatch(/green|emerald/);
  });

  it("returns amber/orange styles for aggressive", () => {
    const styles = getRiskLevelStyles("aggressive");
    expect(styles).toMatch(/amber|orange/);
  });

  it("returns red styles for degen", () => {
    const styles = getRiskLevelStyles("degen");
    expect(styles).toContain("red");
  });
});

describe("formatPnlValue", () => {
  it("formats positive value with + prefix", () => {
    expect(formatPnlValue(1234.56, false)).toBe("+$1,234.56");
  });

  it("formats negative value with - prefix", () => {
    expect(formatPnlValue(-500.25, false)).toBe("-$500.25");
  });

  it("formats zero without sign", () => {
    expect(formatPnlValue(0, false)).toBe("$0.00");
  });

  it("formats as percentage when percentage is true", () => {
    expect(formatPnlValue(12.5, true)).toBe("+12.50%");
  });

  it("formats negative percentage", () => {
    expect(formatPnlValue(-8.3, true)).toBe("-8.30%");
  });
});
