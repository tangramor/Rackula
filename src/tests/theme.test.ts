import {
  describe,
  it,
  expect,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import {
  loadThemeFromStorage,
  saveThemeToStorage,
  applyThemeToDocument,
} from "$lib/utils/theme";

// Mock localStorage for tests
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  },
};

describe("theme utilities", () => {
  beforeAll(() => {
    vi.stubGlobal("localStorage", mockLocalStorage);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe("loadThemeFromStorage", () => {
    afterEach(() => {
      delete mockStorage["Rackula_theme"];
    });

    it("returns dark as default when no theme is stored", () => {
      expect(loadThemeFromStorage()).toBe("dark");
    });

    it("returns stored theme when valid", () => {
      mockStorage["Rackula_theme"] = "light";
      expect(loadThemeFromStorage()).toBe("light");

      mockStorage["Rackula_theme"] = "dark";
      expect(loadThemeFromStorage()).toBe("dark");
    });

    it("returns dark for invalid stored value", () => {
      mockStorage["Rackula_theme"] = "invalid";
      expect(loadThemeFromStorage()).toBe("dark");
    });
  });

  describe("saveThemeToStorage", () => {
    afterEach(() => {
      delete mockStorage["Rackula_theme"];
    });

    it("saves theme to localStorage", () => {
      saveThemeToStorage("light");
      expect(mockStorage["Rackula_theme"]).toBe("light");

      saveThemeToStorage("dark");
      expect(mockStorage["Rackula_theme"]).toBe("dark");
    });
  });

  describe("applyThemeToDocument", () => {
    afterEach(() => {
      delete document.documentElement.dataset["theme"];
    });

    it("sets theme data attribute on document", () => {
      applyThemeToDocument("light");
      expect(document.documentElement.dataset["theme"]).toBe("light");

      applyThemeToDocument("dark");
      expect(document.documentElement.dataset["theme"]).toBe("dark");
    });
  });
});
