import { describe, it, expect } from "vitest";
import { SETUP_TILES } from "@/lib/strategyDraft";
import {
  EXPLAINER_KINDS,
  explainerKindForSetupTile,
  explainerKindForEntryMode,
  explainerKindForExitMode,
} from "@/lib/strategyLabExplainers";

describe("strategyLabExplainers", () => {
  it("maps every setup tile to a known explainer kind", () => {
    for (const t of SETUP_TILES) {
      const kind = explainerKindForSetupTile(t.key);
      expect(EXPLAINER_KINDS).toContain(kind);
    }
  });

  it("uses the combined scenes for the hybrid headline indicators", () => {
    expect(explainerKindForSetupTile("rsi")).toBe("rsi-entry");
    expect(explainerKindForSetupTile("trend")).toBe("ma-cross");
    expect(explainerKindForSetupTile("EMA")).toBe("ma-cross");
    expect(explainerKindForSetupTile("MACD")).toBe("macd");
  });

  it("maps entry and exit modes, falling back to 'none' for unknowns", () => {
    expect(explainerKindForEntryMode("candle_pattern")).toBe("candle");
    expect(explainerKindForEntryMode("price_level")).toBe("price-cross");
    expect(explainerKindForExitMode("bracket")).toBe("bracket");
    expect(explainerKindForExitMode("trailing")).toBe("trailing");
    expect(explainerKindForSetupTile("does-not-exist")).toBe("none");
  });
});
