/**
 * Debug Logging Utility Tests
 * Verifies console logging uses standardized [Rackula:category] format
 *
 * Note: Debug logging is disabled by default in tests to reduce noise.
 * These tests enable it via window.Rackula_DEBUG to verify functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debug } from "$lib/utils/debug";

describe("Debug Logging", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Enable debug for these tests
    window.Rackula_DEBUG = true;
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    window.Rackula_DEBUG = undefined;
  });

  describe("Log Format Standards", () => {
    it("debug.log() outputs [Rackula:debug] prefix", () => {
      debug.log("test message");
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0];
      expect(call?.[0]).toBe("[Rackula:debug]");
    });

    it("debug.info() outputs [Rackula] prefix", () => {
      debug.info("test message");
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0];
      expect(call?.[0]).toBe("[Rackula]");
    });

    it("debug.devicePlace() outputs [Rackula:device:place] prefix", () => {
      debug.devicePlace({
        slug: "test-device",
        position: 1,
        passedFace: "front",
        effectiveFace: "both",
        deviceName: "Test Device",
        isFullDepth: true,
        result: "success",
      });
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0];
      expect(call?.[0]).toMatch(/^\[Rackula:device:place\]/);
    });

    it("debug.deviceMove() outputs [Rackula:device:move] prefix", () => {
      debug.deviceMove({
        index: 0,
        deviceName: "Test Device",
        face: "both",
        fromPosition: 1,
        toPosition: 5,
        result: "success",
      });
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0];
      expect(call?.[0]).toMatch(/^\[Rackula:device:move\]/);
    });

    it("debug.collision() outputs [Rackula:collision] prefix", () => {
      debug.collision({
        position: 1,
        height: 2,
        face: "both",
        isFullDepth: true,
        existingDevices: [],
        result: "clear",
      });
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0];
      expect(call?.[0]).toMatch(/^\[Rackula:collision\]/);
    });
  });

  describe("Warn and Error Logging", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("debug.warn() outputs [Rackula:debug:warn] prefix", () => {
      debug.warn("warning message");
      expect(warnSpy).toHaveBeenCalled();
      const call = warnSpy.mock.calls[0];
      expect(call?.[0]).toBe("[Rackula:debug:warn]");
    });

    it("debug.error() outputs [Rackula:debug:error] prefix", () => {
      debug.error("error message");
      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0];
      expect(call?.[0]).toBe("[Rackula:debug:error]");
    });
  });

  describe("Group Logging", () => {
    let groupSpy: ReturnType<typeof vi.spyOn>;
    let groupEndSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      groupSpy = vi.spyOn(console, "group").mockImplementation(() => {});
      groupEndSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    });

    afterEach(() => {
      groupSpy.mockRestore();
      groupEndSpy.mockRestore();
    });

    it("debug.group() outputs [Rackula:debug] prefix with label", () => {
      debug.group("Test Group");
      expect(groupSpy).toHaveBeenCalled();
      const call = groupSpy.mock.calls[0];
      expect(call?.[0]).toBe("[Rackula:debug] Test Group");
    });
  });

  describe("Debug State", () => {
    it("isEnabled() returns true when Rackula_DEBUG is set", () => {
      // window.Rackula_DEBUG is set in beforeEach
      expect(debug.isEnabled()).toBe(true);
    });

    it("isEnabled() returns false by default in test environment", () => {
      // Temporarily disable
      window.Rackula_DEBUG = undefined;
      expect(debug.isEnabled()).toBe(false);
    });
  });
});
