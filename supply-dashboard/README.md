# Openhouse Supply Closure Tracker

Live dashboard connected to your Neon PostgreSQL database. Deployed on Vercel.

---

## Project Structure

```
supply-dashboard/
├── api/
│   ├── _db.js            # Shared Neon connection
│   ├── properties.js     # GET /api/properties
│   └── update.js         # PATCH /api/update
├── public/
│   └── index.html        # Dashboard frontend
├── scripts/
│   ├── migration.sql     # SQL to add new columns
│   └── setup-db.js       # Run migration script
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

---

## Setup Steps (15 minutes)

### Step 1: Get your Neon connection string

1. Go to [Neon Console](https://console.neon.tech)
2. Open your project → **Connection Details**
3. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`)

### Step 2: Add dashboard columns to your database

Your `properties` table already exists. You just need to add 5 new columns for the dashboard features (status override + 4 comment fields).

**Option A — Run from terminal:**
```bash
# Clone/download this project
cd supply-dashboard
npm install

# Run the migration
DATABASE_URL="your_connection_string_here" npm run db:setup
```

**Option B — Run SQL directly in Neon Console:**

Go to Neon Console → SQL Editor, paste and run:
```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS status_override TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS closure_team_comments TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rahool_comments TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS prashant_comments TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS demand_team_comments TEXT DEFAULT '';
```

### Step 3: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 4: Deploy

```bash
cd supply-dashboard
vercel
```

During the first deploy, Vercel will ask:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No
- **Project name?** → `openhouse-supply-dashboard` (or whatever you want)
- **Directory?** → `./` (current directory)

### Step 5: Add environment variable

```bash
vercel env add DATABASE_URL
```

Paste your Neon connection string when prompted. Select all environments (Production, Preview, Development).

### Step 6: Redeploy with the env variable

```bash
vercel --prod
```

**That's it.** Vercel will give you a URL like `https://openhouse-supply-dashboard.vercel.app`. Open it — your live dashboard is running.

---

## How It Works

| Action | What happens |
|--------|-------------|
| Page loads | Frontend calls `GET /api/properties` → fetches all rows from Neon |
| Change status dropdown | Saves to `status_override` column via `PATCH /api/update` |
| Type in comment field | Auto-saves after 800ms of no typing (debounced) |
| Click a row | Expands to show visit details + balcony images |

All changes persist in your Neon database. Multiple team members can use the dashboard simultaneously.

---

## Local Development

```bash
# Create .env file
cp .env.example .env
# Edit .env and paste your DATABASE_URL

# Run locally
vercel dev
```

Opens at `http://localhost:3000`

---

## Custom Domain (Optional)

```bash
vercel domains add supply.openhouse.in
```

Or add it via Vercel Dashboard → Project Settings → Domains.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed to load data" | Check DATABASE_URL is set in Vercel env variables, then redeploy |
| Columns not found | Run the migration SQL (Step 2) |
| CORS errors | The API already includes CORS headers — shouldn't happen on Vercel |
| Slow first load | Normal for serverless cold start (~1-2s). Subsequent loads are fast |
