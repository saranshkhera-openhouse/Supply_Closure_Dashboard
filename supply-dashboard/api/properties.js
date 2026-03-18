const { getDB } = require("./_db");
const { requireAuth } = require("./_auth");
const legacyData = require("./_legacy.json");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const sql = getDB();

    // Step 1: Get live properties from Neon
    const rows = await sql`
      SELECT 
        uid, source, demand_price,
        owner_first_name, owner_last_name, first_name, last_name, owner_broker_name,
        contact_no, city, locality, society_name, unit_no, floor, tower_no,
        configuration, area_sqft, bathrooms, balconies, gas_pipeline,
        parking, furnishing, furnishing_details, exit_facing,
        video_link, registry_status, occupancy_status,
        guaranteed_sale_price, performance_guarantee,
        initial_period, grace_period, outstanding_loan, bank_name_loan,
        field_exec, assigned_by, token_requested_by,
        schedule_date, visit_submitted_at, token_submitted_at,
        token_deal_submitted_at, final_submitted_at, listing_submitted_at,
        token_amount_requested, deal_token_amount, remaining_amount,
        balcony_details, image_urls, additional_images,
        exit_compass_image, documents_available,
        status_override, offer_price, closure_team_comments, rahool_comments,
        prashant_comments, demand_team_comments,
        closure_team_comments_at, rahool_comments_at,
        prashant_comments_at, demand_team_comments_at
      FROM properties
      ORDER BY created_at DESC
    `;

    const liveProperties = rows.map(transformRow);

    // Step 2: Load legacy edits from DB and apply to CSV data
    let legacyWithEdits = legacyData.map(r => ({...r})); // shallow copy
    try {
      const edits = await sql`SELECT uid, field, value, updated_at FROM legacy_edits`;
      const editMap = {}; // uid -> { field: {value, updated_at} }
      edits.forEach(e => {
        if (!editMap[e.uid]) editMap[e.uid] = {};
        editMap[e.uid][e.field] = { value: e.value, updated_at: e.updated_at };
      });
      const FIELD_TO_KEY = {
        "status_override": "statusOverride",
        "offer_price": "offerPrice",
        "closure_team_comments": "closureTeamComments",
        "rahool_comments": "rahoolComments",
        "prashant_comments": "prashantComments",
        "demand_team_comments": "demandTeamComments",
      };
      const COMMENT_TS_MAP = {
        "closure_team_comments": "closureTeamCommentsAt",
        "rahool_comments": "rahoolCommentsAt",
        "prashant_comments": "prashantCommentsAt",
        "demand_team_comments": "demandTeamCommentsAt",
      };
      legacyWithEdits.forEach(p => {
        const saved = editMap[p.uid];
        if (!saved) return;
        Object.entries(saved).forEach(([dbField, obj]) => {
          const jsKey = FIELD_TO_KEY[dbField];
          if (jsKey) p[jsKey] = obj.value;
          const tsKey = COMMENT_TS_MAP[dbField];
          if (tsKey && obj.updated_at) p[tsKey] = obj.updated_at;
        });
      });
    } catch {}

    // Step 3: Merge live + legacy
    const allProperties = [...liveProperties, ...legacyWithEdits];

    // Step 3: Apply visibility filtering
    if (user.role === "admin") {
      return res.status(200).json(allProperties);
    }

    // Non-admins: filter by team directory
    let teamRows = [];
    try {
      teamRows = await sql`SELECT email, display_name, manager_email FROM team_directory WHERE is_active = true`;
    } catch (teamErr) {
      console.error("team_directory query failed:", teamErr.message);
      // If table doesn't exist, return all data (no filtering)
      return res.status(200).json(allProperties);
    }

    const userEmail = user.email.toLowerCase();

    const myNames = teamRows
      .filter(t => (t.email || "").toLowerCase() === userEmail)
      .map(t => (t.display_name || "").toLowerCase());

    const reporteeNames = teamRows
      .filter(t => (t.manager_email || "").toLowerCase() === userEmail)
      .map(t => (t.display_name || "").toLowerCase());

    const visibleNames = [...new Set([...myNames, ...reporteeNames])];

    if (visibleNames.length === 0) {
      return res.status(200).json([]);
    }

    const filtered = allProperties.filter(r => {
      const assignedBy = (r.assignedBy || "").toLowerCase();
      const fieldExec = (r.fieldExec || "").toLowerCase();
      const tokenBy = (r.tokenRequestedBy || "").toLowerCase();

      return visibleNames.some(name =>
        assignedBy.includes(name) ||
        fieldExec.includes(name) ||
        tokenBy.includes(name) ||
        (name.includes(assignedBy) && assignedBy.length > 2) ||
        (name.includes(fieldExec) && fieldExec.length > 2) ||
        (name.includes(tokenBy) && tokenBy.length > 2)
      );
    });

    return res.status(200).json(filtered);
  } catch (err) {
    console.error("Error fetching properties:", err);
    return res.status(500).json({ error: "Failed to fetch properties: " + err.message });
  }
};

function parseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function transformRow(r) {
  const ownerName =
    [r.first_name, r.last_name].filter(Boolean).join(" ") ||
    r.owner_broker_name ||
    [r.owner_first_name, r.owner_last_name].filter(Boolean).join(" ") ||
    "";

  return {
    uid: r.uid,
    isLegacy: false,
    source: r.source || "",
    demandPrice: r.demand_price || "",
    ownerName,
    contactNo: r.contact_no || "",
    city: r.city || "",
    locality: r.locality || "",
    society: r.society_name || "",
    unitNo: r.unit_no || "",
    floor: r.floor || "",
    towerNo: r.tower_no || "",
    configuration: r.configuration || "",
    areaSqft: r.area_sqft || "",
    bathrooms: r.bathrooms || "",
    balconies: r.balconies || "",
    gasPipeline: r.gas_pipeline || "",
    parking: r.parking || "",
    furnishing: r.furnishing || "",
    furnishingDetails: parseJson(r.furnishing_details),
    exitFacing: r.exit_facing || "",
    videoLink: r.video_link || "",
    registryStatus: r.registry_status || "",
    occupancyStatus: r.occupancy_status || "",
    guaranteedSalePrice: r.guaranteed_sale_price || "",
    performanceGuarantee: r.performance_guarantee || "",
    initialPeriod: r.initial_period || "",
    gracePeriod: r.grace_period || "",
    outstandingLoan: r.outstanding_loan || "",
    bankNameLoan: r.bank_name_loan || "",
    fieldExec: r.field_exec || "",
    assignedBy: r.assigned_by || "",
    tokenRequestedBy: r.token_requested_by || "",
    scheduleDate: r.schedule_date || "",
    visitSubmittedAt: r.visit_submitted_at || "",
    tokenSubmittedAt: r.token_submitted_at || "",
    tokenDealSubmittedAt: r.token_deal_submitted_at || "",
    finalSubmittedAt: r.final_submitted_at || "",
    listingSubmittedAt: r.listing_submitted_at || "",
    tokenAmountRequested: r.token_amount_requested || "",
    dealTokenAmount: r.deal_token_amount || "",
    remainingAmount: r.remaining_amount || "",
    balconyDetails: parseJson(r.balcony_details),
    exitCompassImage: r.exit_compass_image || "",
    documentsAvailable: parseJson(r.documents_available),
    statusOverride: r.status_override || "",
    offerPrice: r.offer_price || "",
    closureTeamComments: r.closure_team_comments || "",
    rahoolComments: r.rahool_comments || "",
    prashantComments: r.prashant_comments || "",
    demandTeamComments: r.demand_team_comments || "",
    closureTeamCommentsAt: r.closure_team_comments_at || "",
    rahoolCommentsAt: r.rahool_comments_at || "",
    prashantCommentsAt: r.prashant_comments_at || "",
    demandTeamCommentsAt: r.demand_team_comments_at || "",
  };
}
