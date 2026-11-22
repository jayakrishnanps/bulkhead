import { describe, expect, it } from "vitest";
import { findImageUrls } from "../src/markdown";

describe("findImageUrls", () => {
  it("extracts the address of a simple image", () => {
    expect(findImageUrls("![x](https://a.invalid/p.png?d=1)")).toEqual([
      "https://a.invalid/p.png?d=1",
    ]);
  });

  it("extracts the address without the title when a title is present", () => {
    expect(
      findImageUrls('text ![x](https://a.invalid/p.png "title")'),
    ).toEqual(["https://a.invalid/p.png"]);
  });

  it("returns two addresses in order for two images in one text", () => {
    const text = "![a](https://a.invalid/1.png) and ![b](https://a.invalid/2.png)";
    expect(findImageUrls(text)).toEqual([
      "https://a.invalid/1.png",
      "https://a.invalid/2.png",
    ]);
  });

  it("ignores normal links that are not images", () => {
    expect(findImageUrls("[x](https://a.invalid)")).toEqual([]);
  });

  it("extracts address from an image with empty alt text", () => {
    expect(findImageUrls("![](https://a.invalid/x)")).toEqual([
      "https://a.invalid/x",
    ]);
  });

  it("returns an empty array for plain text with no markdown", () => {
    expect(findImageUrls("just some plain text")).toEqual([]);
  });
});
