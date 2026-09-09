import { expect, test } from "vitest";
import { describeDevice } from "./deviceDescription";

test("a browser and a system become one readable line", () => {
  expect(
    describeDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    ),
  ).toBe("Chrome on Windows");
});

test("Edge is named before Chrome, whose marker it also carries", () => {
  expect(
    describeDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
    ),
  ).toBe("Edge on Windows");
});

test("a system without a browser marker is still worth saying", () => {
  expect(describeDevice("Mozilla/5.0 (Linux; rv:1.0)")).toBe("Linux");
});

test("nothing to go on becomes an honest unknown", () => {
  expect(describeDevice(null)).toBe("Unknown browser");
  expect(describeDevice("   ")).toBe("Unknown browser");
  expect(describeDevice("curl/8.4.0")).toBe("Unknown browser");
});
