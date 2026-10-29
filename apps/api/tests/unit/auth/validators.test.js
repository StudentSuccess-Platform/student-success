import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateRegister, validateLogin } from "../../../src/validators/authValidators.js";

describe("auth validators", () => {
  describe("validateRegister", () => {
    test("accepts valid register payload", () => {
      assert.doesNotThrow(() => {
        validateRegister({
          email: "test@example.com",
          password: "Password123!",
          role: "teacher",
          firstName: "John",
          lastName: "Doe",
        });
      });
    });

    test("rejects invalid email", () => {
      try {
        validateRegister({
          email: "not-an-email",
          password: "Password123!",
          role: "teacher",
          firstName: "John",
          lastName: "Doe",
        });
        assert.fail("Should have thrown");
      } catch (error) {
        assert.equal(error.status, 400);
        assert.match(error.message, /email/i);
      }
    });

    test("rejects short password", () => {
      try {
        validateRegister({
          email: "test@example.com",
          password: "Pass123",
          role: "teacher",
          firstName: "John",
          lastName: "Doe",
        });
        assert.fail("Should have thrown");
      } catch (error) {
        assert.equal(error.status, 400);
        assert.match(error.message, /password/i);
      }
    });

    test("rejects admin role", () => {
      try {
        validateRegister({
          email: "test@example.com",
          password: "Password123!",
          role: "admin",
          firstName: "John",
          lastName: "Doe",
        });
        assert.fail("Should have thrown");
      } catch (error) {
        assert.equal(error.status, 400);
        assert.match(error.message, /role/i);
      }
    });

    test("rejects empty first name", () => {
      try {
        validateRegister({
          email: "test@example.com",
          password: "Password123!",
          role: "teacher",
          firstName: "",
          lastName: "Doe",
        });
        assert.fail("Should have thrown");
      } catch (error) {
        assert.equal(error.status, 400);
        assert.match(error.message, /first name/i);
      }
    });

    test("rejects empty last name", () => {
      try {
        validateRegister({
          email: "test@example.com",
          password: "Password123!",
          role: "teacher",
          firstName: "John",
          lastName: "",
        });
        assert.fail("Should have thrown");
      } catch (error) {
        assert.equal(error.status, 400);
        assert.match(error.message, /last name/i);
      }
    });

    test("accepts all valid roles", () => {
      ["teacher", "student", "parent"].forEach((role) => {
        assert.doesNotThrow(() => {
          validateRegister({
            email: "test@example.com",
            password: "Password123!",
            role,
            firstName: "John",
            lastName: "Doe",
          });
        });
      });
    });
  });

  describe("validateLogin", () => {
    test("accepts valid login payload", () => {
      assert.doesNotThrow(() => {
        validateLogin({
          email: "test@example.com",
          password: "Password123!",
        });
      });
    });

    test("rejects invalid email", () => {
      try {
        validateLogin({
          email: "not-an-email",
          password: "Password123!",
        });
        assert.fail("Should have thrown");
      } catch (error) {
        assert.equal(error.status, 400);
        assert.match(error.message, /email/i);
      }
    });

    test("rejects missing password", () => {
      try {
        validateLogin({
          email: "test@example.com",
        });
        assert.fail("Should have thrown");
      } catch (error) {
        assert.equal(error.status, 400);
        assert.match(error.message, /password/i);
      }
    });
  });
});
