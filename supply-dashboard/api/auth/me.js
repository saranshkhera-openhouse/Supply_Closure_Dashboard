const { verifySession } = require("../_auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await verifySession(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  return res.status(200).json({ user });
};
