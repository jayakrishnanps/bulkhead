import { describe, expect, it } from "vitest";
import { getHostname, hostInDomains } from "../src/url";

describe("url helpers", () => {
  it("extracts hostname from full url", () => {
    expect(getHostname("https://api.example.test/v1")).toBe("api.example.test");
  });

  it("normalizes hostname case and strips port and query", () => {
    expect(getHostname("HTTPS://Evil.INVALID:8080/x?y=1")).toBe("evil.invalid");
  });

  it("adds https protocol when missing", () => {
    expect(getHostname("attacker.invalid/drop")).toBe("attacker.invalid");
  });

  it("returns null for invalid urls and names without dots", () => {
    expect(getHostname("not a url")).toBeNull();
    expect(getHostname("")).toBeNull();
    expect(getHostname("hello")).toBeNull();
  });

  it("matches subdomain in allowed domains", () => {
    expect(hostInDomains("api.example.test", ["example.test"])).toBe(true);
  });

  it("matches exact domain in allowed domains", () => {
    expect(hostInDomains("example.test", ["example.test"])).toBe(true);
  });

  it("rejects non matching domain suffix", () => {
    expect(hostInDomains("badexample.test", ["example.test"])).toBe(false);
  });
});
