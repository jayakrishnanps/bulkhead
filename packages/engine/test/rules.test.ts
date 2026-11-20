import { describe, expect, it } from "vitest";
import { MAX_RULES_TEXT_LENGTH } from "../src/constants";
import { parseRules } from "../src/rules";

describe("parseRules", () => {
  it("parses valid yaml with two rules and maps argument matcher", () => {
    const yamlText = [
      "rules:",
      "  - name: rule-one",
      "    when:",
      "      tool: read_file",
      "      arg.path:",
      '        iglob: "**/.ssh/**"',
      "    do: deny",
      '    say: "Forbidden"',
      "  - name: rule-two",
      "    do: allow",
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rules.length).toBe(2);
      expect(result.rules[0]?.when.args?.path).toEqual({
        iglob: "**/.ssh/**",
      });
    }
  });

  it("returns zero rules for empty string", () => {
    const result = parseRules("");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rules.length).toBe(0);
    }
  });

  it("fails when rule has an unknown key", () => {
    const yamlText = [
      "rules:",
      "  - name: test-rule",
      "    do: allow",
      "    unexpected_field: true",
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      const hasKeyError = result.errors.some((error) => {
        return error.includes("unexpected_field");
      });
      expect(hasKeyError).toBe(true);
    }
  });

  it("fails when do action is not allowed", () => {
    const yamlText = [
      "rules:",
      "  - name: invalid-action",
      '    do: "block"',
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(false);
  });

  it("fails when two rules share the same name", () => {
    const yamlText = [
      "rules:",
      "  - name: duplicate-name",
      "    do: allow",
      "  - name: duplicate-name",
      "    do: deny",
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(false);
  });

  it("fails when session_has contains an invalid label", () => {
    const yamlText = [
      "rules:",
      "  - name: bad-label",
      "    when:",
      "      session_has: [PRIVATE, WRONG]",
      "    do: deny",
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(false);
  });

  it("fails when arg matcher has two keys", () => {
    const yamlText = [
      "rules:",
      "  - name: two-matcher-keys",
      "    when:",
      "      arg.path:",
      '        glob: "*.ts"',
      '        equals: "main.ts"',
      "    do: deny",
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(false);
  });

  it("fails when arg matcher has an unknown key", () => {
    const yamlText = [
      "rules:",
      "  - name: unknown-matcher-key",
      "    when:",
      "      arg.path:",
      '        regex: ".*"',
      "    do: deny",
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(false);
  });

  it("fails when repeated_over is less than one", () => {
    const yamlText = [
      "rules:",
      "  - name: zero-repeated-over",
      "    when:",
      "      repeated_over: 0",
      "    do: deny",
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(false);
  });

  it("fails when yaml uses anchors and aliases", () => {
    const yamlText = [
      "rules:",
      "  - &rule_anchor",
      "    name: anchored-rule",
      "    do: allow",
      "  - *rule_anchor",
    ].join("\n");
    const result = parseRules(yamlText);
    expect(result.ok).toBe(false);
  });

  it("fails when text exceeds maximum rules text length", () => {
    const longText = "a".repeat(MAX_RULES_TEXT_LENGTH + 1);
    const result = parseRules(longText);
    expect(result.ok).toBe(false);
  });

  it("fails when text is not valid yaml", () => {
    const result = parseRules("rules: [");
    expect(result.ok).toBe(false);
  });
});
