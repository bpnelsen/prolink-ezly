# Prolink Backend API

Express.js + TypeScript backend for the Prolink contractor SaaS platform.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict) |
| Framework | Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Validation | Zod |
| Logging | Winston |
| Tests | Jest + Supertest |
| Container | Docker + Docker Compose |

## Getting Started

```bash
cp .env.example .env
# Fill in your Supabase credentials in .env

npm install
npm run dev
```

Apply the database schema in your Supabase SQL editor:

```bash
# Copy contents of database/schema.sql into Supabase SQL editor and run
```

## Scripts

```bash
npm run dev       # Dev server with hot reload
npm run build     # Compile TypeScript
npm start         # Run compiled build
npm test          # Run integration tests
```

## Docker

```bash
cd docker
docker compose up --build
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `PORT` | No | HTTP port (default: 3000) |
| `STRIPE_SECRET_KEY` | No | For payment processing (Phase 2) |

---

## API Reference

Base URL: `http://localhost:3000/api/v1`

All authenticated endpoints require:
```
Authorization: Bearer <supabase_access_token>
```

---

### Auth

#### Register
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contractor@example.com",
    "password": "securepass123",
    "full_name": "John Smith",
    "business_name": "Smith Plumbing LLC",
    "business_type": "llc"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "contractor@example.com", "password": "securepass123"}'
```

#### Refresh Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<your_refresh_token>"}'
```

#### Get Current User
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

---

### Contractor Profile

#### Get Profile
```bash
curl http://localhost:3000/api/v1/contractor/profile \
  -H "Authorization: Bearer <token>"
```

#### Update Profile
```bash
curl -X PUT http://localhost:3000/api/v1/contractor/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"business_name": "Smith & Sons Plumbing", "employee_count": 5}'
```

#### Add Trade
```bash
curl -X POST http://localhost:3000/api/v1/contractor/trades \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"trade": "Plumbing", "years_experience": 10, "is_primary": true}'
```

#### Delete Trade
```bash
curl -X DELETE http://localhost:3000/api/v1/contractor/trades/<trade_id> \
  -H "Authorization: Bearer <token>"
```

#### Add Service Area
```bash
curl -X POST http://localhost:3000/api/v1/contractor/service-areas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"state_code": "TX", "zip_code": "78701", "radius_miles": 25}'
```

#### Add License
```bash
curl -X POST http://localhost:3000/api/v1/contractor/licenses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "state_code": "TX",
    "license_type": "Master Plumber",
    "license_number": "TX-MP-00123",
    "expiration_date": "2027-12-31",
    "status": "active"
  }'
```

#### Add Insurance
```bash
curl -X POST http://localhost:3000/api/v1/contractor/insurance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "insurance_type": "general_liability",
    "provider": "State Farm",
    "policy_number": "POL-123456",
    "coverage_amount": 1000000,
    "expiration_date": "2027-06-30"
  }'
```

---

### CRM — Clients

#### List Clients
```bash
curl "http://localhost:3000/api/v1/clients?page=1&limit=20&search=smith" \
  -H "Authorization: Bearer <token>"
```

#### Create Client
```bash
curl -X POST http://localhost:3000/api/v1/clients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "512-555-0100",
    "city": "Austin",
    "state_code": "TX",
    "zip_code": "78701"
  }'
```

#### Get Client
```bash
curl http://localhost:3000/api/v1/clients/<client_id> \
  -H "Authorization: Bearer <token>"
```

#### Update Client
```bash
curl -X PUT http://localhost:3000/api/v1/clients/<client_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"phone": "512-555-0200", "tags": ["vip", "repeat"]}'
```

#### Delete Client
```bash
curl -X DELETE http://localhost:3000/api/v1/clients/<client_id> \
  -H "Authorization: Bearer <token>"
```

#### Add Note
```bash
curl -X POST http://localhost:3000/api/v1/clients/<client_id>/notes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"note": "Prefers morning appointments."}'
```

#### Get Notes
```bash
curl http://localhost:3000/api/v1/clients/<client_id>/notes \
  -H "Authorization: Bearer <token>"
```

---

### Leads

#### List Leads
```bash
curl "http://localhost:3000/api/v1/leads?status=new&priority=high" \
  -H "Authorization: Bearer <token>"
```

#### Create Lead
```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Bob",
    "last_name": "Builder",
    "email": "bob@example.com",
    "phone": "512-555-0300",
    "trade_needed": "Electrical",
    "project_description": "Panel upgrade for new appliances",
    "estimated_budget": 3500,
    "priority": "high"
  }'
```

#### Update Lead Status
```bash
curl -X PUT http://localhost:3000/api/v1/leads/<lead_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "contacted"}'
```

#### Log Activity
```bash
curl -X POST http://localhost:3000/api/v1/leads/<lead_id>/activity \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"activity_type": "call", "description": "Left voicemail"}'
```

#### Convert Lead to Client
```bash
curl -X POST http://localhost:3000/api/v1/leads/<lead_id>/convert \
  -H "Authorization: Bearer <token>"
```

---

### Jobs

#### List Jobs
```bash
curl "http://localhost:3000/api/v1/jobs?status=in_progress" \
  -H "Authorization: Bearer <token>"
```

#### Create Job
```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client_id>",
    "title": "Kitchen Plumbing Renovation",
    "trade": "Plumbing",
    "scheduled_start": "2026-05-15",
    "scheduled_end": "2026-05-20",
    "estimated_value": 8500,
    "priority": "high"
  }'
```

#### Update Job Status
```bash
curl -X PUT http://localhost:3000/api/v1/jobs/<job_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "actual_start": "2026-05-15"}'
```

#### Add Milestone
```bash
curl -X POST http://localhost:3000/api/v1/jobs/<job_id>/milestones \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rough-in complete",
    "due_date": "2026-05-17",
    "payment_amount": 4250,
    "sort_order": 1
  }'
```

#### Add Photo
```bash
curl -X POST http://localhost:3000/api/v1/jobs/<job_id>/photos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-bucket.supabase.co/storage/v1/object/public/job-photos/photo.jpg",
    "caption": "Before demo",
    "photo_type": "before"
  }'
```

#### Add Document
```bash
curl -X POST http://localhost:3000/api/v1/jobs/<job_id>/documents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Signed Contract",
    "url": "https://your-bucket.supabase.co/storage/v1/object/public/job-documents/contract.pdf",
    "document_type": "contract"
  }'
```

---

### Invoices

#### List Invoices
```bash
curl "http://localhost:3000/api/v1/invoices?status=sent" \
  -H "Authorization: Bearer <token>"
```

#### Create Invoice
```bash
curl -X POST http://localhost:3000/api/v1/invoices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client_id>",
    "job_id": "<job_id>",
    "issue_date": "2026-05-01",
    "due_date": "2026-05-31",
    "tax_rate": 0.0825,
    "notes": "Thank you for your business!",
    "terms": "Net 30",
    "line_items": [
      {"description": "Labor - Plumbing rough-in", "quantity": 16, "unit_price": 125},
      {"description": "Materials - PEX pipe and fittings", "quantity": 1, "unit_price": 450}
    ]
  }'
```

Response includes auto-generated invoice number: `PRO-2026-00001`

#### Send Invoice
```bash
curl -X POST http://localhost:3000/api/v1/invoices/<invoice_id>/send \
  -H "Authorization: Bearer <token>"
```

#### Record Payment
```bash
curl -X POST http://localhost:3000/api/v1/invoices/<invoice_id>/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "payment_method": "check",
    "reference_number": "CHK-1042",
    "notes": "Deposit payment"
  }'
```

#### Get Payments
```bash
curl http://localhost:3000/api/v1/invoices/<invoice_id>/payments \
  -H "Authorization: Bearer <token>"
```

---

### Messaging

#### List Conversations
```bash
curl http://localhost:3000/api/v1/conversations \
  -H "Authorization: Bearer <token>"
```

#### Create Conversation
```bash
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "<client_id>", "job_id": "<job_id>", "subject": "Project update"}'
```

#### Send Message
```bash
curl -X POST http://localhost:3000/api/v1/conversations/<conv_id>/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"body": "The rough-in is complete. Inspection scheduled for Friday."}'
```

#### Get Messages
```bash
curl http://localhost:3000/api/v1/conversations/<conv_id>/messages \
  -H "Authorization: Bearer <token>"
```

#### Mark Message Read
```bash
curl -X PUT http://localhost:3000/api/v1/conversations/<conv_id>/messages/<msg_id>/read \
  -H "Authorization: Bearer <token>"
```

---

### Dashboard

#### Summary
```bash
curl http://localhost:3000/api/v1/dashboard/summary \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "data": {
    "jobs": { "total": 12, "by_status": { "in_progress": 3, "scheduled": 5, "draft": 4 } },
    "clients": { "total": 47 },
    "leads": { "total": 8, "by_status": { "new": 3, "contacted": 5 } },
    "invoices": {
      "total_revenue": 84500.00,
      "outstanding": 12750.00,
      "overdue_count": 2,
      "open_count": 5
    }
  }
}
```

#### Revenue by Month
```bash
curl "http://localhost:3000/api/v1/dashboard/revenue?year=2026" \
  -H "Authorization: Bearer <token>"
```

#### Lead Funnel
```bash
curl http://localhost:3000/api/v1/dashboard/leads \
  -H "Authorization: Bearer <token>"
```

---

## Response Format

All endpoints follow this structure:

**Success:**
```json
{ "data": { ... }, "message": "Optional message" }
```

**Paginated list:**
```json
{ "data": [...], "total": 47, "page": 1, "limit": 20, "totalPages": 3 }
```

**Error:**
```json
{ "error": "Human-readable message", "code": "ERROR_CODE" }
```

## Storage Buckets

Create these buckets in Supabase Storage (private, authenticated access):

- `job-photos` — before/during/after job photos
- `job-documents` — contracts, permits, etc.
- `contractor-documents` — licenses, insurance certificates

## Architecture Notes

- All routes under `/api/v1/`
- Service role key used server-side — bypasses RLS (data isolation enforced at service layer via `contractor_id` filter on every query)
- RLS policies are enabled on all tables as a defense-in-depth measure
- All timestamps stored and returned in UTC
- `state_code` always stored as 2-char uppercase
- Invoice numbers format: `PRO-{YEAR}-{SEQUENCE}` e.g. `PRO-2026-00001`
