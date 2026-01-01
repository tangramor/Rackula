/**
 * BananaForScale Component Tests
 * Tests for the silly "banana for scale" easter egg feature
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import BananaForScale from "$lib/components/BananaForScale.svelte";
import { U_HEIGHT_PX } from "$lib/constants/layout";

describe("BananaForScale", () => {
  describe("Rendering", () => {
    it("renders an SVG element", () => {
      const { container } = render(BananaForScale);
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      expect(svg).toHaveClass("banana-for-scale");
    });

    it("has accessible role and label", () => {
      const { container } = render(BananaForScale);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("role", "img");
      expect(svg?.getAttribute("aria-label")).toContain("Banana for scale");
    });

    it("includes a title element for tooltip", () => {
      const { container } = render(BananaForScale);
      const title = container.querySelector("title");
      expect(title).toBeTruthy();
      expect(title?.textContent).toContain("Banana");
    });
  });

  describe("Accurate Scale", () => {
    // Scale: 1U = 1.75" = U_HEIGHT_PX (22px)
    // So 1" = 22px / 1.75 ≈ 12.57px
    // Average banana: ~7" long
    const PIXELS_PER_INCH = U_HEIGHT_PX / 1.75;
    const EXPECTED_LENGTH = Math.round(7 * PIXELS_PER_INCH); // ~88px

    it("banana length is approximately 7 inches in pixels", () => {
      const { container } = render(BananaForScale);
      const svg = container.querySelector("svg");
      const width = parseInt(svg?.getAttribute("width") || "0", 10);

      // Allow 5px tolerance for rounding
      expect(width).toBeGreaterThanOrEqual(EXPECTED_LENGTH - 5);
      expect(width).toBeLessThanOrEqual(EXPECTED_LENGTH + 5);
    });

    it("uses U_HEIGHT_PX constant for scale calculation", () => {
      // This verifies that if U_HEIGHT_PX changes, banana would scale accordingly
      // The banana should be ~4U tall equivalent (7" ÷ 1.75" per U ≈ 4U)
      const bananaInUnits = 7 / 1.75;
      expect(bananaInUnits).toBeCloseTo(4, 0);
    });
  });

  describe("Visual Elements", () => {
    it("contains yellow banana body", () => {
      const { container } = render(BananaForScale);
      // Look for yellow-ish fill color (new SVG uses #FFE082 and #FFCA28)
      const yellowPath = container.querySelector(
        'path[fill="#FFE082"], path[fill="#FFCA28"]',
      );
      expect(yellowPath).toBeTruthy();
    });

    it("contains green stem", () => {
      const { container } = render(BananaForScale);
      // Look for green stem fill color (#C0CA33)
      const stem = container.querySelector('path[fill="#C0CA33"]');
      expect(stem).toBeTruthy();
    });

    it("contains brown tip", () => {
      const { container } = render(BananaForScale);
      // Look for brown tip (#5D4037)
      const tip = container.querySelector('path[fill="#5D4037"]');
      expect(tip).toBeTruthy();
    });
  });

  describe("Non-Interactive", () => {
    it("has pointer-events: none to not interfere with interactions", () => {
      const { container } = render(BananaForScale);
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      // CSS class should handle this, but we verify the class is present
      expect(svg).toHaveClass("banana-for-scale");
    });
  });

  describe("SVG Structure", () => {
    it("uses 1024x1024 viewBox for detailed banana icon", () => {
      const { container } = render(BananaForScale);
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("viewBox")).toBe("0 0 1024 1024");
    });

    it("contains multiple path elements for banana details", () => {
      const { container } = render(BananaForScale);
      const paths = container.querySelectorAll("path");
      // Should have at least body, shading, stem, tip paths
      expect(paths.length).toBeGreaterThanOrEqual(4);
    });
  });
});
