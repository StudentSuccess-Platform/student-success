import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, PASSWORD } from "../../helpers/fixtures.js";
import { User } from "../../../src/models/index.js";

const uri = createTestDatabaseUri();
const hash = (token) => createHash("sha256").update(token).digest("hex");

describe("password reset", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;

  const post = (path, body) =>
    fetch(`${ctx.baseUrl}/api/v1/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    await createSchool();
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  test("forgot-password answers the same for known and unknown emails", async () => {
    const known = await post("/forgot-password", { email: "ada@example.test" });
    const unknown = await post("/forgot-password", { email: "nobody@example.test" });
    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.deepEqual(await known.json(), await unknown.json());
  });

  test("forgot-password stores only a hash of the token and rejects bad email", async () => {
    await post("/forgot-password", { email: "ben@example.test" });
    const user = await User.findOne({ email: "ben@example.test" }).select("+passwordResetHash +passwordResetExpires");
    assert.match(user.passwordResetHash, /^[0-9a-f]{64}$/);
    assert.ok(user.passwordResetExpires > new Date());
    assert.equal((await post("/forgot-password", { email: "not-an-email" })).status, 400);
  });

  test("reset-password sets a new password, once", async () => {
    const token = "a".repeat(64);
    await User.updateOne(
      { email: "parent@example.test" },
      { passwordResetHash: hash(token), passwordResetExpires: new Date(Date.now() + 60_000) },
    );

    assert.equal((await post("/reset-password", { token, password: "short" })).status, 400);
    const ok = await post("/reset-password", { token, password: "BrandNewPass1!" });
    assert.equal(ok.status, 200);

    assert.equal((await post("/login", { email: "parent@example.test", password: "BrandNewPass1!" })).status, 200);
    assert.equal((await post("/login", { email: "parent@example.test", password: PASSWORD })).status, 401);
    assert.equal((await post("/reset-password", { token, password: "AnotherPass123!" })).status, 400);
  });

  test("reset-password rejects unknown and expired tokens", async () => {
    assert.equal((await post("/reset-password", { token: "nope", password: "Password123!" })).status, 400);

    const token = "b".repeat(64);
    await User.updateOne(
      { email: "ada@example.test" },
      { passwordResetHash: hash(token), passwordResetExpires: new Date(Date.now() - 1000) },
    );
    assert.equal((await post("/reset-password", { token, password: "Password123!" })).status, 400);
    assert.equal((await post("/reset-password", { password: "Password123!" })).status, 400);
  });
});
