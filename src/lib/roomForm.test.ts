import { describe, expect, it } from "vitest";
import { buildCreateRoomInput } from "./roomForm";

const base = { maxParticipants: 4, durationMinutes: 15 as const };

describe("buildCreateRoomInput", () => {
  it("sends the trimmed topic when the creator types one", () => {
    expect(buildCreateRoomInput({ ...base, topic: "  Weekend plans ", hostPicksTopic: false })).toEqual({
      topic: "Weekend plans",
      ...base,
    });
  });

  it("requires a topic without the toggle", () => {
    expect(buildCreateRoomInput({ ...base, topic: "   ", hostPicksTopic: false })).toBeNull();
  });

  it("omits the topic entirely when the host picks it, even if something was typed", () => {
    const out = buildCreateRoomInput({ ...base, topic: "ignored", hostPicksTopic: true });
    expect(out).toEqual({ hostPicksTopic: true, ...base });
    expect(out && "topic" in out).toBe(false);
  });
});
