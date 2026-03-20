const { getDB } = require("./_db");
const { requireAuth } = require("./_auth");

const COMMENT_FIELDS = [
  "status_override",
  "offer_price",
  "closure_team_comments",
  "rahool_comments",
  "prashant_comments",
  "demand_team_comments"
];

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res);
  if (!user) return;

  // Viewers cannot edit anything
  if (user.role === "viewer") {
    return res.status(403).json({ error: "Viewers cannot make edits" });
  }

  try {
    const { uid, field, value } = req.body;

    if (!uid || !field) {
      return res.status(400).json({ error: "uid and field are required" });
    }

    // Commenters can only edit comment fields
    if (user.role === "commenter" && !COMMENT_FIELDS.includes(field)) {
      return res.status(403).json({ error: "Commenters can only edit comments, status, and offer price" });
    }

    // Legacy rows
    if (uid.startsWith("LEGACY-")) {
      if (!COMMENT_FIELDS.includes(field)) {
        return res.status(400).json({ error: "Invalid field: " + field });
      }
      const sql = getDB();
      await sql`
        INSERT INTO legacy_edits (uid, field, value, updated_at)
        VALUES (${uid}, ${field}, ${value || ""}, NOW())
        ON CONFLICT (uid, field) DO UPDATE SET value = ${value || ""}, updated_at = NOW()
      `;
      return res.status(200).json({ success: true, uid, field, value });
    }

    if (!COMMENT_FIELDS.includes(field)) {
      return res.status(400).json({ error: "Invalid field: " + field });
    }

    const sql = getDB();

    const COMMENT_TS = {
      "closure_team_comments": "closure_team_comments_at",
      "rahool_comments": "rahool_comments_at",
      "prashant_comments": "prashant_comments_at",
      "demand_team_comments": "demand_team_comments_at",
    };

    const tsCol = COMMENT_TS[field];
    let query, params;
    if (tsCol) {
      query = `UPDATE properties SET ${field} = $1, ${tsCol} = NOW() WHERE uid = $2 RETURNING uid`;
      params = [value || "", uid];
    } else {
      query = `UPDATE properties SET ${field} = $1 WHERE uid = $2 RETURNING uid`;
      params = [value || "", uid];
    }
    const result = await sql(query, params);

    if (result.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    return res.status(200).json({ success: true, uid, field, value });
  } catch (err) {
    console.error("Error updating property:", err);
    return res.status(500).json({ error: "Failed to update property" });
  }
};
