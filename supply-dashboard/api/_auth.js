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

// Fetch live role from DB (role in JWT might be stale if admin changed it)
async function getLiveRole(email) {
  try {
    const { neon } = require("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT role FROM dashboard_users WHERE LOWER(email) = ${email.toLowerCase()}`;
    return rows.length > 0 ? rows[0].role : "viewer";
  } catch {
    return null; // fallback to JWT role if DB fails
  }
}

async function requireAuth(req, res) {
  const user = await verifySession(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  // Override with live role from DB
  const liveRole = await getLiveRole(user.email);
  if (liveRole) user.role = liveRole;
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
