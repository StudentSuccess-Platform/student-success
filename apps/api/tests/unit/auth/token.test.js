import { describe, test, before } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

describe("JWT token handling", () => {
  const testSecret = "test-secret-key";
  const testUser = {
    _id: "userId123",
    roles: ["teacher"],
  };

  before(() => {
    process.env.JWT_SECRET = testSecret;
  });

  test("can sign and verify a token", () => {
    const token = jwt.sign({ roles: testUser.roles }, testSecret, {
      subject: String(testUser._id),
      expiresIn: "1h",
    });

    const payload = jwt.verify(token, testSecret);
    assert.equal(payload.sub, String(testUser._id));
    assert.deepEqual(payload.roles, testUser.roles);
  });

  test("token with wrong secret fails verification", () => {
    const token = jwt.sign({ roles: testUser.roles }, testSecret, {
      subject: String(testUser._id),
      expiresIn: "1h",
    });

    assert.throws(() => {
      jwt.verify(token, "wrong-secret");
    });
  });

  test("expired token fails verification", () => {
    const token = jwt.sign({ roles: testUser.roles }, testSecret, {
      subject: String(testUser._id),
      expiresIn: "0s",
    });

    // Wait a bit for token to expire
    return new Promise((resolve) => {
      setTimeout(() => {
        assert.throws(() => {
          jwt.verify(token, testSecret);
        });
        resolve();
      }, 100);
    });
  });
});
