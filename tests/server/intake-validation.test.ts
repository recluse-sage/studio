import { describe, it, expect } from "vitest";
import { validateIntakeInput } from "../../src/server/validation.ts";

const base = {
  businessName: "Maple Bakery",
  businessType: "food-hospitality",
  taskDescription: "Weekly cake orders pile up in chat and need a simple form.",
  contactMethod: "phone",
  contactValue: "555-0100",
  turnstileToken: "test-token",
};

describe("intake validation", () => {
  it("accepts a valid payload", () => {
    const r = validateIntakeInput({ ...base });
    expect(r.ok).toBe(true);
  });

  it("rejects missing business name", () => {
    const r = validateIntakeInput({ ...base, businessName: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects short task description", () => {
    const r = validateIntakeInput({ ...base, taskDescription: "hi" });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid business type", () => {
    const r = validateIntakeInput({ ...base, businessType: "rocket-factory" });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid contact method", () => {
    const r = validateIntakeInput({ ...base, contactMethod: "pager" });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid email contact value", () => {
    const r = validateIntakeInput({
      ...base,
      contactMethod: "email",
      contactValue: "not-an-email",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects overlong optional fields", () => {
    const r = validateIntakeInput({ ...base, frequency: "x".repeat(61) });
    expect(r.ok).toBe(false);
  });

  it("rejects filled honeypot", () => {
    const r = validateIntakeInput({ ...base, website: "http://spam.example" });
    expect(r.ok).toBe(false);
  });

  it("rejects mass assignment of status, source, and id", () => {
    for (const payload of [
      { ...base, status: "scoped" },
      { ...base, source: "landing" },
      { ...base, id: "abc" },
      { ...base, isAdmin: true },
    ]) {
      expect(validateIntakeInput(payload).ok).toBe(false);
    }
  });

  it("rejects missing turnstile token", () => {
    const { turnstileToken, ...rest } = base;
    void turnstileToken;
    expect(validateIntakeInput(rest).ok).toBe(false);
  });
});
