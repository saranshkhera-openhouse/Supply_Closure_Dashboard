const { getDB } = require("./_db");
const { requireAuth } = require("./_auth");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const sql = getDB();

    const rows = await sql`
      SELECT 
        uid, source, demand_price, owner_first_name, owner_last_name,
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
        status_override, closure_team_comments, rahool_comments,
        prashant_comments, demand_team_comments
      FROM properties
      ORDER BY created_at DESC
    `;

    // Transform rows to match frontend format
    const properties = rows.map(r => ({
      uid: r.uid,
      source: r.source || "",
      demandPrice: r.demand_price || "",
      ownerName: [r.owner_first_name, r.owner_last_name].filter(Boolean).join(" ") || "",
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
      furnishingDetails: r.furnishing_details || [],
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
      balconyDetails: r.balcony_details || [],
      exitCompassImage: r.exit_compass_image || "",
      documentsAvailable: r.documents_available || [],
      // Editable fields
      statusOverride: r.status_override || "",
      closureTeamComments: r.closure_team_comments || "",
      rahoolComments: r.rahool_comments || "",
      prashantComments: r.prashant_comments || "",
      demandTeamComments: r.demand_team_comments || "",
    }));

    return res.status(200).json(properties);
  } catch (err) {
    console.error("Error fetching properties:", err);
    return res.status(500).json({ error: "Failed to fetch properties" });
  }
};
