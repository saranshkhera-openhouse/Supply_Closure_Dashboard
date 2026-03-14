const { SignJWT, jwtVerify } = require("jose");

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "openhouse-dashboard-secret-change-me");
const COOKIE_NAME = "oh_session";

async function createSession(user) {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
  return token;
}

async function verifySession(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload; // { email, name, role }
  } catch {
    return null;
  }
}

async function requireAuth(req, res) {
  const user = await verifySession(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return user;
}

async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}; Secure`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function parseCookies(str) {
  const obj = {};
  str.split(";").forEach(pair => {
    const [k, ...v] = pair.trim().split("=");
    if (k) obj[k] = v.join("=");
  });
  return obj;
}

module.exports = { createSession, verifySession, requireAuth, requireAdmin, setSessionCookie, clearSessionCookie, COOKIE_NAME };
