# TODO - Inventory Management Web App (QR + Images)

## Step 1 — Inventory requirements → DB + API design
- [x] Gather current repo structure (Flask + React + PostgreSQL via docker-compose)
- [x] Draft PostgreSQL schema for inventory domain
- [x] Draft REST API contract for materials, movements, scan_history, photos
- [x] Decide scan page access requires JWT login (per user confirmation)

## Step 2 — Implement backend
- [ ] Add inventory modules: db/authz/qr/photos/materials/movements
- [ ] Add QR generation utilities and endpoints
- [ ] Add image upload handling with multiple photos
- [ ] Add materials CRUD with filters (company/service/user/type/status)
- [ ] Add movement history tracking
- [ ] Add scan logging endpoint
- [ ] Register inventory routes in backend/app.py
- [ ] Update backend/requirements.txt

## Step 3 — Implement database schema
- [ ] Create `backend/inventory_schema.sql` (or similar) with all required tables + FKs + indexes

## Step 4 — Implement frontend
- [ ] Add Inventory button for admin and IT on Dashboard
- [ ] Add Inventory pages/components: List/Filters/Create/Edit/Detail
- [ ] Add scan material page at `/material/:id` (authenticated)
- [ ] Add QR download/print controls on material detail

## Step 5 — Wiring & deployment
- [ ] Update frontend/App.jsx and navigation/routing
- [ ] Update docker-compose if needed (volumes for uploads)
- [ ] Smoke test: create material with QR + photos → scan page displays details

## Step 6 — Final verification
- [ ] Validate permissions for scan detail and scan logging
- [ ] Ensure history shows movements + scan_history

