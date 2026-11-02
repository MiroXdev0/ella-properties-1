import { describe, expect, it } from "bun:test";

import type { Property } from "../src/data/properties";
import {
  cleanPropertyText,
  formatPropertyArea,
  formatPropertyPrice,
  getPropertyCardSpecifications,
} from "../src/lib/property-format";
import {
  isManagedPropertyMediaPath,
  validatePropertyMediaFile,
} from "../src/lib/admin/property-images";
import { MAX_UPLOAD_BYTES } from "../src/lib/media";

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: "preview",
    title: "Test property",
    type: "Апартамент",
    listing: "Продажба",
    city: "Перник",
    district: "",
    price: 100_000,
    area: 80,
    image: null,
    description: "",
    ...overrides,
  };
}

describe("property card formatting", () => {
  it("normalizes whitespace without inventing missing text", () => {
    expect(cleanPropertyText("  Spacious \n  apartment  ")).toBe("Spacious apartment");
    expect(cleanPropertyText(null)).toBe("");
  });

  it("formats valid prices and areas while hiding missing or zero values", () => {
    expect(formatPropertyPrice(100_000, "en")).toContain("100,000");
    expect(formatPropertyPrice(0, "bg")).toBeNull();
    expect(formatPropertyPrice(Number.NaN, "en")).toBeNull();
    expect(formatPropertyArea(80.5, "en")).toBe("80.5 m²");
    expect(formatPropertyArea(null, "bg")).toBeNull();
  });

  it("omits irrelevant or unavailable category specifications", () => {
    expect(
      getPropertyCardSpecifications(
        property({ type: "Парцел", area: 500, rooms: 2, floor: "1", yardArea: 0 }),
        "en",
      ),
    ).toEqual([{ key: "area", value: "500 m²" }]);
  });

  it("limits the specification list to three useful values", () => {
    expect(
      getPropertyCardSpecifications(
        property({ area: 80, rooms: 3, yardArea: 200, floor: "2" }),
        "en",
      ),
    ).toHaveLength(3);
  });
});

describe("property media validation", () => {
  it("only identifies application-generated media object paths for cleanup", () => {
    expect(isManagedPropertyMediaPath("550e8400-e29b-41d4-a716-446655440000.webp")).toBe(true);
    expect(isManagedPropertyMediaPath("team/550e8400-e29b-41d4-a716-446655440000.webp")).toBe(
      false,
    );
    expect(isManagedPropertyMediaPath("shared-brand-logo.png")).toBe(false);
    expect(isManagedPropertyMediaPath("../550e8400-e29b-41d4-a716-446655440000.webp")).toBe(false);
  });

  it("accepts supported image and video files within the configured limit", () => {
    expect(
      validatePropertyMediaFile(new File(["image"], "home.webp", { type: "image/webp" })).valid,
    ).toBe(true);
    expect(
      validatePropertyMediaFile(new File(["video"], "tour.mp4", { type: "video/mp4" })).valid,
    ).toBe(true);
    expect(
      validatePropertyMediaFile(
        new File([new Uint8Array(MAX_UPLOAD_BYTES)], "large.webp", { type: "image/webp" }),
      ).valid,
    ).toBe(true);
  });

  it("rejects unsupported, empty, and oversized files", () => {
    expect(
      validatePropertyMediaFile(new File(["text"], "notes.txt", { type: "text/plain" })),
    ).toEqual({ valid: false, reason: "unsupported" });
    expect(validatePropertyMediaFile(new File([], "empty.png", { type: "image/png" }))).toEqual({
      valid: false,
      reason: "too_large",
    });
    expect(
      validatePropertyMediaFile(
        new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "large.webp", { type: "image/webp" }),
      ),
    ).toEqual({ valid: false, reason: "too_large" });
  });
});
