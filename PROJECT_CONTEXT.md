# Grown Men Only — Ecommerce Web App (MVP)

## Overview
Grown Men Only is a beard grooming ecommerce platform focused on premium products for adult men.  
The application consists of:
1. A **public storefront** where customers can browse and purchase products
2. An **admin portal** where the business owner manages products, inventory, and orders

The goal is to ship a **production-ready MVP** with **zero paid infrastructure**, optimized for speed, simplicity, and future scalability.

---

## Core Principles
- Zero infrastructure cost (free tiers only)
- Monolithic frontend app (no microservices)
- Simple, readable code over clever abstractions
- SQL-first data modeling
- Fast checkout and strong branding

---

## Tech Stack

### Frontend
- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Supabase JS Client**
- Hosted on **Vercel (Free Tier)**

### Backend (BaaS)
- **Supabase**
  - PostgreSQL database
  - Authentication
  - Storage (product images)
  - Edge Functions (for webhooks later)

### Payments
- **Paystack** (Nigeria-first)
- Payment handled via redirect + webhook confirmation

---

## Application Structure

### Public Pages (Customer)
- `/` → Home / Brand landing
- `/shop` → Product listing
- `/product/[slug]` → Product details
- `/cart` → Shopping cart (client-side)
- `/checkout` → Payment initiation
- `/success` → Payment confirmation

### Admin Pages (Protected)
- `/admin/login`
- `/admin/dashboard`
- `/admin/products`
- `/admin/inventory`
- `/admin/orders`

Admin routes must be accessible **only** to authenticated users with an `admin` role.

---

## Folder Structure

app/
├── layout.tsx
├── page.tsx
├── shop/page.tsx
├── product/[slug]/page.tsx
├── cart/page.tsx
├── checkout/page.tsx
├── success/page.tsx
├── admin/
│ ├── login/page.tsx
│ ├── layout.tsx
│ ├── dashboard/page.tsx
│ ├── products/page.tsx
│ ├── inventory/page.tsx
│ └── orders/page.tsx
components/
├── Navbar.tsx
├── Footer.tsx
├── ProductCard.tsx
├── CartItem.tsx
├── AdminSidebar.tsx
└── ProtectedRoute.tsx
lib/
├── supabaseClient.ts
├── auth.ts
└── cart.ts


---

## Authentication & Authorization
- Authentication handled via **Supabase Auth**
- Admin users are identified via a `role` field (e.g. `admin`)
- Frontend route protection is required
- Backend (DB-level) authorization will be enforced using Supabase RLS

---

## Cart Strategy (MVP)
- Cart state stored in **localStorage**
- Cart is client-side only
- Inventory validation happens at checkout
- No persistent carts for now

---

## Branding & UI Direction
- Masculine, bold, minimal design
- Dark theme (black / charcoal)
- Accent colors inspired by wood, leather, beard oil tones
- Strong typography, minimal UI noise

This is a **men’s grooming brand**, not a generic ecommerce store.

---

## Non-Goals (For MVP)
- No mobile app
- No multi-vendor support
- No discount engine
- No complex shipping logic
- No background jobs (yet)

---

## Future Enhancements (Out of Scope for Now)
- Paid Supabase tier
- Background jobs
- Analytics dashboard
- Mobile app
- Subscription products

---

## Success Criteria for MVP
- Users can browse products and checkout successfully
- Admin can manage products and inventory
- Payments are reliable
- UI feels premium and trustworthy
- Infrastructure cost is ₦0 (excluding transaction fees)

---

## Tone for Codebase
- Explicit > implicit
- Simple > clever
- Readable > abstract
- Business-driven decisions over engineering purity
