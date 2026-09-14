import { describe, expect, it } from "vitest";
import { formatCountdown, remainingMs } from "./countdown";

describe("remainingMs", () => {
  const now = Date.parse("2026-09-13T10:00:00Z");

  it("counts down to scheduledEndAt", () => {
    expect(remainingMs("2026-09-13T10:30:00Z", now)).toBe(30 * 60_000);
  });

  it("clamps at zero once the deadline has passed", () => {
    expect(remainingMs("2026-09-13T09:59:00Z", now)).toBe(0);
  });

  it("is null without a deadline (room not started) or with an unparsable one", () => {
    expect(remainingMs(undefined, now)).toBeNull();
    expect(remainingMs("soon", now)).toBeNull();
  });
});

describe("formatCountdown", () => {
  it("formats minutes and seconds", () => {
    expect(formatCountdown(30 * 60_000)).toBe("30:00");
    expect(formatCountdown(65_000)).toBe("1:05");
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("rounds partial seconds up so it never shows 0:00 early", () => {
    expect(formatCountdown(999)).toBe("0:01");
    expect(formatCountdown(59_001)).toBe("1:00");
  });

  it("switches to h:mm:ss from an hour", () => {
    expect(formatCountdown(60 * 60_000)).toBe("1:00:00");
    expect(formatCountdown(3_723_000)).toBe("1:02:03");
  });
});
