import { describe, expect, it } from "vitest";
import { calculatePercentage } from "../usage";
import {
  APP_SETTINGS_KEYS,
  AUDIT_ACTIONS,
  BILLING_MANAGEMENT_ROLES,
  DEFAULT_ENTERPRISE_CONTACT_LINK,
  FEATURE_DEFINITIONS,
  FEATURE_KEYS,
  FREE_TIER_FEATURES,
  ORG_STATUS,
  PENDING_WORKSPACE_TTL_HOURS,
  TRIAL_DURATION_DAYS,
} from "../constants";
import { parseFeatureValue } from "../features";

describe("parseFeatureValue", () => {
  it("parses 'true' to boolean true", () => {
    expect(parseFeatureValue("true")).toBe(true);
  });

  it("parses 'false' to boolean false", () => {
    expect(parseFeatureValue("false")).toBe(false);
  });

  it("parses 'unlimited' to string 'unlimited'", () => {
    expect(parseFeatureValue("unlimited")).toBe("unlimited");
  });

  it("parses integer strings to numbers", () => {
    expect(parseFeatureValue("0")).toBe(0);
    expect(parseFeatureValue("1")).toBe(1);
    expect(parseFeatureValue("42")).toBe(42);
    expect(parseFeatureValue("100")).toBe(100);
    expect(parseFeatureValue("-1")).toBe(-1);
  });

  it("does not parse floats as numbers", () => {
    expect(parseFeatureValue("3.14")).toBe("3.14");
  });

  it("returns other strings as-is", () => {
    expect(parseFeatureValue("custom")).toBe("custom");
    expect(parseFeatureValue("hello world")).toBe("hello world");
    expect(parseFeatureValue("")).toBe("");
  });
});

describe("calculatePercentage", () => {
  it("returns 0 when limit is null", () => {
    expect(calculatePercentage(5, null)).toBe(0);
  });

  it("returns 0 when limit is 'unlimited'", () => {
    expect(calculatePercentage(5, "unlimited")).toBe(0);
  });

  it("returns 0 when limit is 0", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it("calculates percentage correctly", () => {
    expect(calculatePercentage(1, 2)).toBe(50);
    expect(calculatePercentage(3, 10)).toBe(30);
    expect(calculatePercentage(7, 10)).toBe(70);
  });

  it("caps at 100%", () => {
    expect(calculatePercentage(15, 10)).toBe(100);
    expect(calculatePercentage(200, 100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(calculatePercentage(1, 3)).toBe(33);
    expect(calculatePercentage(2, 3)).toBe(67);
  });
});

describe("constants", () => {
  describe("FEATURE_KEYS", () => {
    it("has all expected feature keys", () => {
      expect(FEATURE_KEYS.MAX_MEMBERS).toBe("max_members");
      expect(FEATURE_KEYS.MAX_PROJECTS).toBe("max_projects");
      expect(FEATURE_KEYS.API_ACCESS).toBe("api_access");
      expect(FEATURE_KEYS.CUSTOM_DOMAIN).toBe("custom_domain");
      expect(FEATURE_KEYS.PRIORITY_SUPPORT).toBe("priority_support");
      expect(FEATURE_KEYS.AUDIT_LOGS).toBe("audit_logs");
      expect(FEATURE_KEYS.SSO_ENABLED).toBe("sso_enabled");
      expect(FEATURE_KEYS.WEBHOOKS).toBe("webhooks");
      expect(FEATURE_KEYS.ANALYTICS).toBe("analytics");
      expect(FEATURE_KEYS.WHITE_LABEL).toBe("white_label");
    });

    it("has exactly 10 keys", () => {
      expect(Object.keys(FEATURE_KEYS)).toHaveLength(10);
    });
  });

  describe("FREE_TIER_FEATURES", () => {
    it("covers every FEATURE_KEY", () => {
      for (const key of Object.values(FEATURE_KEYS)) {
        expect(FREE_TIER_FEATURES).toHaveProperty(key);
      }
    });

    it("has no extra keys beyond FEATURE_KEYS", () => {
      const featureKeyValues = new Set(Object.values(FEATURE_KEYS) as string[]);
      for (const key of Object.keys(FREE_TIER_FEATURES)) {
        expect(featureKeyValues.has(key)).toBe(true);
      }
    });

    it("limits numeric features to 1 on free tier", () => {
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.MAX_MEMBERS]).toBe(1);
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.MAX_PROJECTS]).toBe(1);
    });

    it("disables all boolean features on free tier", () => {
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.API_ACCESS]).toBe(false);
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.CUSTOM_DOMAIN]).toBe(false);
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.PRIORITY_SUPPORT]).toBe(false);
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.AUDIT_LOGS]).toBe(false);
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.SSO_ENABLED]).toBe(false);
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.WEBHOOKS]).toBe(false);
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.ANALYTICS]).toBe(false);
      expect(FREE_TIER_FEATURES[FEATURE_KEYS.WHITE_LABEL]).toBe(false);
    });
  });

  describe("FEATURE_DEFINITIONS", () => {
    it("has one definition per FEATURE_KEY", () => {
      expect(FEATURE_DEFINITIONS).toHaveLength(
        Object.keys(FEATURE_KEYS).length,
      );
    });

    it("every definition has required fields", () => {
      for (const def of FEATURE_DEFINITIONS) {
        expect(def.key).toBeTruthy();
        expect(def.label).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(["boolean", "number", "string"]).toContain(def.type);
        expect(def.defaultFreeValue).toBeDefined();
      }
    });

    it("definition keys match FEATURE_KEYS values", () => {
      const definitionKeys = new Set(FEATURE_DEFINITIONS.map((d) => d.key));
      for (const key of Object.values(FEATURE_KEYS)) {
        expect(definitionKeys.has(key)).toBe(true);
      }
    });
  });

  describe("ORG_STATUS", () => {
    it("has all four statuses", () => {
      expect(ORG_STATUS.PENDING).toBe("pending");
      expect(ORG_STATUS.ACTIVE).toBe("active");
      expect(ORG_STATUS.READONLY).toBe("readonly");
      expect(ORG_STATUS.SUSPENDED).toBe("suspended");
    });
  });

  describe("AUDIT_ACTIONS", () => {
    it("has all expected actions", () => {
      expect(Object.keys(AUDIT_ACTIONS)).toHaveLength(12);
      expect(AUDIT_ACTIONS.WORKSPACE_CREATED).toBe("workspace_created");
      expect(AUDIT_ACTIONS.PAYMENT_SUCCEEDED).toBe("payment_succeeded");
    });
  });

  describe("BILLING_MANAGEMENT_ROLES", () => {
    it("includes owner and billing_admin", () => {
      expect(BILLING_MANAGEMENT_ROLES).toContain("owner");
      expect(BILLING_MANAGEMENT_ROLES).toContain("billing_admin");
    });

    it("does not include member or admin", () => {
      expect(BILLING_MANAGEMENT_ROLES).not.toContain("member");
      expect(BILLING_MANAGEMENT_ROLES).not.toContain("admin");
    });
  });

  describe("scalar constants", () => {
    it("trial duration is 14 days", () => {
      expect(TRIAL_DURATION_DAYS).toBe(14);
    });

    it("pending workspace TTL is 24 hours", () => {
      expect(PENDING_WORKSPACE_TTL_HOURS).toBe(24);
    });

    it("default enterprise contact is a mailto link", () => {
      expect(DEFAULT_ENTERPRISE_CONTACT_LINK).toMatch(/^mailto:/);
    });

    it("APP_SETTINGS_KEYS has enterprise_contact_link", () => {
      expect(APP_SETTINGS_KEYS.ENTERPRISE_CONTACT_LINK).toBe(
        "enterprise_contact_link",
      );
    });
  });
});
