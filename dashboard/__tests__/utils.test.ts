// Test file for dashboard utilities
import { 
  validateEmail, 
  validateRequired, 
  validateCoordinates,
  formatCurrency,
  formatDate,
  formatDateTime
} from "../lib/utils";

describe("Utility Functions", () => {
  describe("validateEmail", () => {
    it("should return true for valid emails", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
      expect(validateEmail("test+tag@example.org")).toBe(true);
    });

    it("should return false for invalid emails", () => {
      expect(validateEmail("invalid.email")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("validateRequired", () => {
    it("should return true for non-empty strings", () => {
      expect(validateRequired("test")).toBe(true);
      expect(validateRequired(" ")).toBe(true);
    });

    it("should return false for empty strings", () => {
      expect(validateRequired("")).toBe(false);
      expect(validateRequired("   ")).toBe(false); // whitespace only
    });

    it("should return true for valid numbers", () => {
      expect(validateRequired(0)).toBe(true);
      expect(validateRequired(42)).toBe(true);
      expect(validateRequired(-1)).toBe(true);
    });

    it("should return false for null or undefined", () => {
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });
  });

  describe("validateCoordinates", () => {
    it("should return true for valid coordinates", () => {
      expect(validateCoordinates(0, 0)).toBe(true);
      expect(validateCoordinates(45.5, -122.3)).toBe(true);
      expect(validateCoordinates(-90, 180)).toBe(true);
      expect(validateCoordinates(90, -180)).toBe(true);
    });

    it("should return false for invalid coordinates", () => {
      expect(validateCoordinates(91, 0)).toBe(false);
      expect(validateCoordinates(-91, 0)).toBe(false);
      expect(validateCoordinates(0, 181)).toBe(false);
      expect(validateCoordinates(0, -181)).toBe(false);
    });
  });

  describe("formatCurrency", () => {
    it("should format currency correctly", () => {
      expect(formatCurrency(1000)).toBe("$1,000.00");
      expect(formatCurrency(1000.5)).toBe("$1,000.50");
      expect(formatCurrency(0)).toBe("$0.00");
    });
  });

  describe("formatDate", () => {
    it("should format date correctly", () => {
      const date = "2023-12-25T10:30:00Z";
      // Note: Actual output depends on user's locale
      expect(formatDate(date)).toMatch(/\w{3} \d{1,2}, \d{4}/);
    });
  });

  describe("formatDateTime", () => {
    it("should format datetime correctly", () => {
      const date = "2023-12-25T10:30:00Z";
      // Note: Actual output depends on user's locale
      expect(formatDateTime(date)).toMatch(/\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM)/);
    });
  });
});