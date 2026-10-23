const test = require("node:test");
const assert = require("node:assert/strict");
const { promisify } = require("node:util");
const { scrypt } = require("node:crypto");

process.env.AUTH_SECRET = "test-auth-secret-that-is-long-enough";
const {
  createAuthToken,
  requireAuth,
  requireRole,
  verifyAuthToken,
} = require("../middleware/auth");
const User = require("../models/userModel");
const { validRoles } = require("../controller/userController");
const { changePassword, initializeSuperAdmin, login, register } = require("../controller/authController");

test("the user model and role-management API expose only the three supported roles", () => {
  const expectedRoles = ["admin", "staff", "user"];
  assert.deepEqual(User.schema.path("role").enumValues, expectedRoles);
  assert.deepEqual(validRoles, expectedRoles);
  assert.equal(User.schema.path("canManageProducts").defaultValue, false);
});

test("registration always creates a regular user, even if an admin role is submitted", async () => {
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  let createdUser;
  User.findOne = async () => null;
  User.create = async (values) => {
    createdUser = { id: "new-user", ...values };
    return createdUser;
  };

  const response = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await register({
      body: {
        name: "New Account",
        email: "user@example.com",
        password: "secure-password",
        role: "admin",
      },
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(createdUser.role, "user");
    assert.equal(response.body.user.role, "user");
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
  }
});

test("login preserves the regular-user role", async () => {
  const originalFindOne = User.findOne;
  const passwordSalt = "test-password-salt";
  const passwordHash = (await promisify(scrypt)("secure-password", passwordSalt, 64)).toString("hex");
  const user = {
    id: "registered-user",
    name: "Registered User",
    email: "user@example.com",
    role: "user",
    canManageProducts: false,
    passwordSalt,
    passwordHash,
  };
  User.findOne = () => ({
    async select() {
      return user;
    },
  });

  const response = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await login({ body: { email: user.email, password: "secure-password" } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.user.role, "user");
  } finally {
    User.findOne = originalFindOne;
  }
});

test("change password requires the current password and stores a fresh hash", async () => {
  const passwordSalt = "test-password-salt";
  const passwordHash = (await promisify(scrypt)("current-password", passwordSalt, 64)).toString("hex");
  const user = {
    passwordSalt,
    passwordHash,
    passwordResetTokenHash: "old-reset-token",
    passwordResetExpires: new Date(),
    async save() {
      this.saved = true;
    },
  };
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => user,
  });
  const response = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await changePassword({
      user: { sub: "admin-id" },
      body: { currentPassword: "current-password", newPassword: "new-password-123" },
    }, response);

    assert.equal(response.statusCode, null);
    assert.equal(response.body.success, true);
    assert.equal(user.saved, true);
    assert.equal(user.passwordHash.length, 128);
    assert.notEqual(user.passwordHash, passwordHash);
    assert.notEqual(user.passwordSalt, passwordSalt);
    assert.equal(user.passwordResetTokenHash, undefined);
    assert.equal(user.passwordResetExpires, undefined);
  } finally {
    User.findById = originalFindById;
  }
});

test("change password rejects an incorrect current password and weak new passwords", async () => {
  const passwordSalt = "test-password-salt";
  const passwordHash = (await promisify(scrypt)("current-password", passwordSalt, 64)).toString("hex");
  const user = {
    passwordSalt,
    passwordHash,
    async save() {
      assert.fail("The password must not be saved.");
    },
  };
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => user,
  });
  const createResponse = () => ({
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  });

  try {
    const incorrectCurrentPasswordResponse = createResponse();
    await changePassword({
      user: { sub: "admin-id" },
      body: { currentPassword: "wrong-password", newPassword: "new-password-123" },
    }, incorrectCurrentPasswordResponse);
    assert.equal(incorrectCurrentPasswordResponse.statusCode, 401);

    const weakNewPasswordResponse = createResponse();
    await changePassword({
      user: { sub: "admin-id" },
      body: { currentPassword: "current-password", newPassword: "short" },
    }, weakNewPasswordResponse);
    assert.equal(weakNewPasswordResponse.statusCode, 400);
    assert.match(weakNewPasswordResponse.body.message, /8 to 128/);
  } finally {
    User.findById = originalFindById;
  }
});

test("configured Super Admin credentials create an admin account with a password hash", async () => {
  let createdUser;
  const userModel = {
    async findOne() {
      return null;
    },
    async create(values) {
      createdUser = values;
      return values;
    },
  };

  const created = await initializeSuperAdmin({
    userModel,
    email: "stockroom@gmail.com",
    password: "stockroom@22",
  });

  assert.equal(created, true);
  assert.equal(createdUser.email, "stockroom@gmail.com");
  assert.equal(createdUser.role, "admin");
  assert.equal(createdUser.name, "Super Admin");
  assert.notEqual(createdUser.passwordHash, "secure-initial-password");
  assert.equal(createdUser.passwordHash.length, 128);
});

test("configured Super Admin promotes the matching account without resetting its password", async () => {
  const existingUser = {
    role: "user",
    canManageProducts: true,
    async save() {
      this.saved = true;
    },
  };
  const userModel = {
    async findOne() {
      return existingUser;
    },
    async create() {
      assert.fail("An existing account must not be created again.");
    },
  };

  const created = await initializeSuperAdmin({
    userModel,
    email: "admin@example.com",
    password: "secure-initial-password",
  });

  assert.equal(created, false);
  assert.equal(existingUser.role, "admin");
  assert.equal(existingUser.canManageProducts, false);
  assert.equal(existingUser.saved, true);
});

test("Super Admin bootstrap rejects incomplete or weak credentials", async () => {
  const userModel = {
    async findOne() {
      assert.fail("Invalid credentials must be rejected before querying users.");
    },
  };

  await assert.rejects(
    initializeSuperAdmin({ userModel, email: "admin@example.com", password: "" }),
    /must both be configured/,
  );
  await assert.rejects(
    initializeSuperAdmin({ userModel, email: "admin@example.com", password: "short" }),
    /8 to 128 characters/,
  );
});

test("auth token verifies and exposes only session claims", () => {
  const token = createAuthToken({ id: "user-123", name: "Stockroom Employee", email: "person@example.com", role: "admin" });

  const claims = verifyAuthToken(token);
  assert.equal(claims.sub, "user-123");
  assert.equal(claims.email, "person@example.com");
  assert.equal(claims.name, "Stockroom Employee");
  assert.equal(claims.role, "admin");
  assert.ok(claims.exp > Date.now() / 1000);
});

test("auth token rejects tampering and missing bearer credentials", () => {
  const token = createAuthToken({ id: "user-123", email: "person@example.com" });
  const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  assert.equal(verifyAuthToken(tampered), null);

  let statusCode;
  let responseBody;
  let calledNext = false;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
    },
  };

  requireAuth({ get: () => "" }, response, () => { calledNext = true; });

  assert.equal(statusCode, 401);
  assert.equal(responseBody.success, false);
  assert.equal(calledNext, false);
});

test("requireRole blocks users without the required role", () => {
  let statusCode;
  let responseBody;
  let calledNext = false;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
    },
  };

  requireRole("admin")({ user: { role: "user" } }, response, () => {
    calledNext = true;
  });

  assert.equal(statusCode, 403);
  assert.equal(responseBody.success, false);
  assert.equal(calledNext, false);
});

test("staff access is distinct from read-only user access", () => {
  const response = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
  let staffContinued = false;
  let userContinued = false;
  const staffOnlyRole = requireRole(["admin", "staff"]);

  staffOnlyRole({ user: { role: "staff" } }, response, () => {
    staffContinued = true;
  });
  staffOnlyRole({ user: { role: "user" } }, response, () => {
    userContinued = true;
  });

  assert.equal(staffContinued, true);
  assert.equal(userContinued, false);
  assert.equal(response.statusCode, 403);
});
