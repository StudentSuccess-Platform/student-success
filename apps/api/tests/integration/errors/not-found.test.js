import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";

describe("error handling", () => {
  let ctx;
  before(async () => {
    ctx = await startTestServer();
  });
  after(() => ctx.close());

  test("unknown routes return 404", async () => {
    const res = await fetch(`${ctx.baseUrl}/api/v1/does-not-exist`);
    assert.equal(res.status, 404);
  });
});
