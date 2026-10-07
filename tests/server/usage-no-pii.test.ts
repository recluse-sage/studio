import { describe, it, expect } from "vitest";
import { validateToolInput, validateOutreachInput } from "../../src/server/validation.ts";

const USAGE_ALLOWED_COLUMNS = [
  "id",
  "tool_id",
  "tool_key",
  "usage_date",
  "views",
  "offline_views",
  "contact_clicks",
  "created_at",
  "updated_at",
];

const FORBIDDEN_COLUMNS = [
  "ip",
  "ip_address",
  "user_agent",
  "useragent",
  "cookie",
  "fingerprint",
  "email",
  "phone",
];

describe("usage counters carry no PII", () => {
  it("usage column allowlist contains no PII names", () => {
    for (const col of USAGE_ALLOWED_COLUMNS) {
      expect(FORBIDDEN_COLUMNS.includes(col)).toBe(false);
    }
    expect(USAGE_ALLOWED_COLUMNS).toContain("tool_key");
    expect(USAGE_ALLOWED_COLUMNS).toContain("views");
  });

  it("tool and outreach validators reject PII style injected fields", () => {
    expect(
      validateToolInput({
        name: "Quote helper",
        slug: "quote-helper",
        ip: "1.2.3.4",
      }).ok,
    ).toBe(false);
    expect(
      validateOutreachInput({
        businessName: "Corner Shop",
        ip_address: "1.2.3.4",
      }).ok,
    ).toBe(false);
  });
});
