import { describe, it } from "node:test";
import assert from "node:assert";

describe("crons configuration", () => {
  it("exports a default cron configuration", async () => {
    const mod = await import("./crons.ts");
    assert.ok(mod.default, "should export default crons");
  });

  it("crons module loads without error", async () => {
    // If the import succeeds, the cron config is syntactically valid
    const mod = await import("./crons.ts");
    assert.ok(typeof mod.default === "object", "default export should be an object");
  });
});
