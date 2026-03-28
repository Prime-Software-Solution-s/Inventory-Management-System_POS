# InventoryOS

Modern full-stack inventory management system for warehouses, retailers, and small distributors.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express.js
- Database: MongoDB + Mongoose
- Animations: Three.js via `@react-three/fiber`

## Features

- JWT authentication with admin and staff roles
- Dashboard analytics with charts, activity timeline, and subtle 3D warehouse animation
- Product management with SKU protection, image upload, stock badges, and pagination
- Category and supplier management
- Stock adjustments with low-stock and out-of-stock handling
- Purchase orders with approve and receive flows
- Sales creation with automatic inventory deduction and printable receipts
- Reports with CSV, JSON, and print-friendly PDF export flows
- Command palette (`Ctrl + K`)
- Dark and light mode
- Toast notifications and bell notification center

## Project Structure

```text
client/   React application
server/   Express API and MongoDB models
```

## Setup

1. Install dependencies

```bash
npm install
npm install --workspace client
npm install --workspace server
```

2. Create environment files

```bash
copy server\\.env.example server\\.env
copy client\\.env.example client\\.env
```

3. Update `server/.env` with your MongoDB connection string and JWT secret.

4. Start the full stack

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5001`

## Seed Data

After configuring MongoDB:

```bash
npm run seed
```

Demo users:

- Admin: `admin@inventoryos.com` / `Admin123!`
- Staff: `staff@inventoryos.com` / `Staff123!`

## Verification

- Frontend production build: `npm run build --workspace client` (or `npm run client:build` from the repo root)
- API load check: `node -e "require('./src/app')"` from `server/`

## Railway (API)

If deploying the API on Railway, configure the database connection string as a Railway Variable using one of:

- `MONGODB_URI` (recommended)
- `MONGODB_URL`
- `MONGO_URL`
- `MONGO_URI`
- `DATABASE_URL`

### MongoDB Atlas Network Access

If you're using MongoDB Atlas and see an error about the IP not being whitelisted, update your Atlas
project **Network Access / IP Access List** to allow connections from Railway (temporary quick fix: `0.0.0.0/0`).
