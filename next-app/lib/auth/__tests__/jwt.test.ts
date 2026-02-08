import { describe, it, expect, vi, afterEach } from "vitest";

const baseEnv = {
  JWT_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
  JWT_REFRESH_TOKEN_EXPIRES_IN: "7d",
};

const originalEnv = { ...process.env };

async function loadJwt() {
  vi.resetModules();
  process.env = { ...originalEnv, ...baseEnv };
  return import("../jwt");
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("jwt helpers", () => {
  it("signs and verifies access tokens", async () => {
    const { signAccessToken, verifyAccessToken } = await loadJwt();
    const token = await signAccessToken({
      sub: "user-123",
      email: "user@example.com",
      role: "user",
    });
    const payload = await verifyAccessToken(token);
    expect(payload).toEqual({
      sub: "user-123",
      email: "user@example.com",
      role: "user",
    });
  });

  it("returns null for invalid access tokens", async () => {
    const { verifyAccessToken } = await loadJwt();
    const payload = await verifyAccessToken("not-a-token");
    expect(payload).toBeNull();
  });

  it("signs and verifies refresh tokens", async () => {
    const { signRefreshToken, verifyRefreshToken } = await loadJwt();
    const token = await signRefreshToken({ sub: "user-456" });
    const payload = await verifyRefreshToken(token);
    expect(payload).toEqual({ sub: "user-456" });
  });
});
