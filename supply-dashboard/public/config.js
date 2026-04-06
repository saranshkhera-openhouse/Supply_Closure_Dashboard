const ALL_STATUSES = ["AMA Signed","Cancelled post token","Dead - Legal","Dead - Sold","Dead NI","Documents Awaited","Duplicacy","Email Confirmation","Followup","Future Prospect","Hold","Negotiation","Offer Accepted","Offer Made","OH Rejected","Price High","Scheduled","Seller Rejected","Token Transferred"];

const STATUS_COLORS = {
  "Negotiation":       {bg:"#065f46",text:"#fff"},
  "Offer Made":        {bg:"#047857",text:"#fff"},
  "Offer Accepted":    {bg:"#0d9488",text:"#fff"},
  "Token Transferred": {bg:"#1e40af",text:"#fff"},
  "Documents Awaited": {bg:"#d97706",text:"#fff"},
  "AMA Signed":        {bg:"#15803d",text:"#fff"},
  "Email Confirmation":{bg:"#4f46e5",text:"#fff"},
  "Future Prospect":   {bg:"#0369a1",text:"#fff"},
  "Followup":          {bg:"#ca8a04",text:"#fff"},
  "Scheduled":         {bg:"#64748b",text:"#fff"},
  "Price High":        {bg:"#be123c",text:"#fff"},
  "OH Rejected":       {bg:"#e11d48",text:"#fff"},
  "Dead - Sold":       {bg:"#9f1239",text:"#fff"},
  "Dead NI":           {bg:"#881337",text:"#fff"},
  "Dead - Legal":      {bg:"#7f1d1d",text:"#fff"},
  "Duplicacy":         {bg:"#9ca3af",text:"#fff"},
  "Hold":              {bg:"#6b7280",text:"#fff"},
  "Cancelled post token":{bg:"#b45309",text:"#fff"},
  "Seller Rejected":   {bg:"#dc2626",text:"#fff"},
  "New":               {bg:"#d1d5db",text:"#374151"},
};

// ── State ──
let DATA = [];
let currentUser = null; // { email, name, role }
let adminUsers = [];
let adminRequests = [];
let adminTeam = [];
let showAdminPanel = false;
let adminTab = "users"; // "users" | "team" | "bugs"
let showBugForm = false;
let bugSubmitted = false;
let adminBugs = [];
let lastRefreshed = "";
let state = {
  search: "",
  cityFilter: "All",
  statusFilter: [],
  pocFilter: [],
  sourceFilter: "All",
  expandedId: null,
  modalImg: null,
  page: 1,
  sortCol: null,
  sortDir: "asc",
  msOpen: null
};
const PAGE_SIZE = 50;

function canEdit() {
  return currentUser && (currentUser.role === "admin" || currentUser.role === "commenter" || currentUser.role === "demand");
}

// Debounce timers for auto-saving comments
const saveTimers = {};
const saveStatus = {}; // uid_field -> "saving"|"saved"|"error"

