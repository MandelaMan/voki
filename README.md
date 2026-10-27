# Voki - Inventory & Sales Management System

A mobile-first Progressive Web App (PWA) for small businesses to manage inventory, track sales, and monitor stock levels.

Built for jewelry sellers, shoe shops, clothing boutiques, cosmetic stores, electronics shops, and any retail business that buys stock in bulk and sells individual items.

## Features

- **Authentication** - Register, login, JWT + refresh tokens, forgot/reset password, user profile
- **Multi-business** - One user can manage multiple businesses with separate inventories
- **Products** - SKU auto-generation, variants (size/color/model), multiple images, barcode-ready
- **Purchases** - Stock entries with supplier, receipt number, line items
- **Sales** - Quick sale recording with automatic stock deduction and profit calculation
- **Dashboard** - Today's sales, inventory value, profit, stock alerts, revenue charts
- **Inventory** - Grid/list views, search, filters, low stock badges
- **Categories & Suppliers** - Unlimited custom categories and supplier management
- **Reports** - Inventory, sales, profit, low stock, dead stock with CSV export
- **Notifications** - Low stock, out of stock alerts (push-notification ready)
- **PWA** - Installable, offline inventory viewing, offline sales queue with auto-sync
- **Premium list scan** - Photograph a handwritten sales or restock list; Gemini reads it and fills the form
- **Dark mode** - Light/dark theme support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, TailwindCSS, Vite, React Router, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL, Prisma ORM |
| Auth | JWT + Refresh Tokens |
| Storage | Local uploads (S3/Cloudinary ready) |
| PWA | vite-plugin-pwa, Workbox |

## Project Structure

```
voki/
├── backend/
│   ├── prisma/schema.prisma    # Database schema
│   └── src/
│       ├── config/             # Environment config
│       ├── controllers/        # Route handlers
│       ├── services/           # Business logic
│       ├── repositories/       # Data access helpers
│       ├── middleware/         # Auth, validation, upload
│       ├── validators/       # Zod schemas
│       ├── routes/             # API routes
│       └── utils/              # Helpers
└── frontend/
    └── src/
        ├── api/                # API client layer
        ├── components/         # Reusable UI components
        ├── hooks/              # Custom hooks (offline sync)
        ├── pages/              # Route pages
        ├── stores/             # Zustand state management
        └── types/              # TypeScript interfaces
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop (for MySQL)

### 1. Database Setup

Start MySQL in Docker, then push the Prisma schema and seed the test user:

```bash
npm run db:up
cd backend
cp .env.example .env
npx prisma db push
npm run db:seed
```

`docker compose` publishes MySQL on `localhost:3306`. If that port is already in use (for example XAMPP), stop the other MySQL instance first.

Stop the database with `npm run db:down`. Data is kept in the `voki_mysql_data` Docker volume unless you run `docker compose down -v`.

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

### Environment Variables

**Backend (`backend/.env`):**

```
DATABASE_URL="mysql://voki:voki@localhost:3306/voki"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=3001
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=                 # free key from https://aistudio.google.com/apikey (list scanning)
```

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Sign in |
| `GET /api/businesses` | List businesses |
| `GET /api/products` | List products (paginated, filterable) |
| `GET /api/products/search` | Full-text search |
| `POST /api/sales` | Record a sale |
| `POST /api/sales/sync` | Sync offline sales |
| `GET /api/dashboard` | Dashboard statistics |
| `GET /api/reports/*` | Various reports |

## Architecture Notes

### Extensibility

The architecture supports future modules:

- **POS** - Sale creation API is ready for POS integration
- **Barcode** - `barcode` field on products/variants, search by barcode
- **Multi-user** - User/Business separation allows employee roles
- **Cloud storage** - Upload middleware can be swapped for S3/Cloudinary
- **Payments** - PaymentMethod enum includes M-Pesa, Stripe-ready

### Offline Support

- Products cached via service worker (NetworkFirst strategy)
- Sales created offline are queued in localStorage
- Auto-sync on reconnect via `/api/sales/sync`
- Duplicate prevention via `offlineId`

### Soft Deletes

Products, businesses, categories, suppliers, purchases, and sales use `deletedAt` for soft deletion.

### Audit Logs

Key actions (register, login, create product/sale/purchase) are logged to `activity_logs`.

## License

MIT
