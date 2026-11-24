import { describe, expect, it } from "vitest";
import { MAX_RULES_TEXT_LENGTH, MAX_SAY_LENGTH } from "../src/constants";
import { parsePolicy } from "../src/policy";

describe("parsePolicy", () => {
  it("parses valid policy with default deny and mapped arg matcher", () => {
    const yaml = [
      "default: deny",
      "rules:",
      "  - name: rule-one",
      "    when:",
      "      arg.path:",
      '        resolved_glob: "**/.ssh/**"',
      "    do: allow",
      "  - name: rule-two",
      "    do: deny",
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.policy.default).toBe("deny");
      expect(result.policy.rules.length).toBe(2);
      expect(result.policy.rules[0]?.when.args?.path).toEqual({
        resolved_glob: "**/.ssh/**",
      });
    }
  });

  it("keeps unless and say fields when provided", () => {
    const yaml = [
      "rules:",
      "  - name: rule-with-extras",
      "    do: allow",
      "    when:",
      "      tool: read_file",
      "    unless:",
      "      tool_changed: true",
      '    say: "Allowed read"',
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const rule = result.policy.rules[0];
      expect(rule?.unless).toEqual({ tool_changed: true });
      expect(rule?.say).toBe("Allowed read");
    }
  });

  it("handles empty string and default deny alone", () => {
    const emptyResult = parsePolicy("");
    expect(emptyResult.ok).toBe(true);
    if (emptyResult.ok) {
      expect(emptyResult.policy.default).toBe("allow");
      expect(emptyResult.policy.rules).toEqual([]);
    }

    const defaultResult = parsePolicy("default: deny");
    expect(defaultResult.ok).toBe(true);
    if (defaultResult.ok) {
      expect(defaultResult.policy.default).toBe("deny");
      expect(defaultResult.policy.rules).toEqual([]);
    }
  });

  it("rejects unknown top-level key", () => {
    const result = parsePolicy("unexpected: true");
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors).toContain('unknown key "unexpected"');
    }
  });

  it("rejects invalid default", () => {
    const result = parsePolicy("default: maybe");
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors).toContain("default must be allow or deny");
    }
  });

  it("rejects rules that is not a list", () => {
    const result = parsePolicy("rules: not-a-list");
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors).toContain("rules must be a list");
    }
  });

  it("rejects a rule with an unknown key", () => {
    const yaml = [
      "rules:",
      "  - name: test-rule",
      "    do: allow",
      "    extra_key: true",
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      const found = result.errors.some((e) => e.includes("extra_key"));
      expect(found).toBe(true);
    }
  });

  it("rejects a rule without name", () => {
    const yaml = [
      "rules:",
      "  - do: allow",
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors).toContain("Rule 1: name is required");
    }
  });

  it("rejects a rule with invalid do action", () => {
    const yaml = [
      "rules:",
      "  - name: invalid-action",
      "    do: block",
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors).toContain(
        "Rule 1: do must be one of allow, deny, ask",
      );
    }
  });

  it("rejects duplicate rule names", () => {
    const yaml = [
      "rules:",
      "  - name: duplicate-name",
      "    do: allow",
      "  - name: duplicate-name",
      "    do: deny",
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors).toContain("Rule 2: name must be unique");
    }
  });

  it("rejects a rule with a bad condition starting with Rule 1 when", () => {
    const yaml = [
      "rules:",
      "  - name: bad-condition",
      "    do: allow",
      "    when:",
      "      color: red",
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      const found = result.errors.some((e) => e.startsWith("Rule 1 when"));
      expect(found).toBe(true);
    }
  });

  it("rejects say text longer than MAX_SAY_LENGTH", () => {
    const longSay = "a".repeat(MAX_SAY_LENGTH + 1);
    const yaml = [
      "rules:",
      "  - name: long-say",
      "    do: allow",
      `    say: "${longSay}"`,
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      const found = result.errors.some((e) => {
        return e.includes("say must be a string");
      });
      expect(found).toBe(true);
    }
  });

  it("rejects yaml with an anchor and an alias", () => {
    const yaml = [
      "rules:",
      "  - &a",
      "    name: anchored",
      "    do: allow",
      "  - *a",
    ].join("\n");
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(false);
  });

  it("rejects text longer than MAX_RULES_TEXT_LENGTH", () => {
    const longText = "a".repeat(MAX_RULES_TEXT_LENGTH + 1);
    const result = parsePolicy(longText);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors).toEqual(["The policy is too long."]);
    }
  });

  it("rejects invalid yaml syntax", () => {
    const result = parsePolicy("rules: [");
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors[0]?.startsWith("Invalid YAML")).toBe(true);
    }
  });

  it("rejects more than MAX_RULES rules", () => {
    const rulesList = Array.from({ length: 41 }, (_, i) => {
      return `  - name: r${i}\n    do: allow`;
    }).join("\n");
    const yaml = "rules:\n" + rulesList;
    const result = parsePolicy(yaml);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.errors).toContain("Too many rules.");
    }
  });
});
