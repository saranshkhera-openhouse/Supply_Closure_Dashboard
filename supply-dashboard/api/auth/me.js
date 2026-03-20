const { verifySession } = require("../_auth");
const { getDB } = require("../_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await verifySession(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  // Always fetch live role from database (in case admin changed it)
  try {
    const sql = getDB();
    const rows = await sql`SELECT role FROM dashboard_users WHERE LOWER(email) = ${user.email.toLowerCase()}`;
    if (rows.length > 0) {
      user.role = rows[0].role;
    }
  } catch {}

  return res.status(200).json({ user });
};
