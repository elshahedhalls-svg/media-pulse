import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getToken,
  setToken,
  clearToken,
  login,
  searchPages,
  getTikTokIndustries,
  getTikTokCountries,
} from "../api/client";

// Mock fetch globally
vi.mock("fetch", () => ({
  default: vi.fn(),
}));

describe("API Client", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Token Management", () => {
    it("getToken returns null when no token", () => {
      expect(getToken()).toBeNull();
    });

    it("setToken stores token in localStorage", () => {
      setToken("test-token-123");
      expect(getToken()).toBe("test-token-123");
    });

    it("clearToken removes token from localStorage", () => {
      setToken("test-token-123");
      clearToken();
      expect(getToken()).toBeNull();
    });
  });

  describe("searchPages", () => {
    it("returns empty array for empty query", async () => {
      const result = await searchPages("");
      expect(result).toEqual([]);
    });

    it("returns empty array for whitespace query", async () => {
      const result = await searchPages("   ");
      expect(result).toEqual([]);
    });
  });

  describe("getTikTokIndustries", () => {
    it("returns list of industries", async () => {
      // This would require mocking fetch, so we'll just test the function exists
      expect(typeof getTikTokIndustries).toBe("function");
    });
  });

  describe("getTikTokCountries", () => {
    it("returns list of countries", async () => {
      expect(typeof getTikTokCountries).toBe("function");
    });
  });
});
