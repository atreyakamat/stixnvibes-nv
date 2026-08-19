# PLAN_IMPL.md — Stix N Vibes Commerce Operating System Implementation Plan

> **Version**: 1.0 · **Date**: 2026-08-19  
> **Scope**: Current state → Production-ready commercial launch  
> **Primary Target**: Samsung Galaxy S20 FE (Termux) self-hosted + Netlify/Supabase production  
> **Secondary Target**: Docker containerised deployment

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Architecture Target](#2-architecture-target)
3. [Deployment Targets](#3-deployment-targets)
4. [Phase 1 — Transactional Correctness](#4-phase-1--transactional-correctness)
5. [Phase 2 — Payment Correctness](#5-phase-2--payment-correctness)
6. [Phase 3 — Complete Operational Workflow](#6-phase-3--complete-operational-workflow)
7. [Phase 4 — Admin Operational UX](#7-phase-4--admin-operational-ux)
8. [Phase 5 — Observability](#8-phase-5--observability)
9. [Phase 6 — Real E2E Integration](#9-phase-6--real-e2e-integration)
10. [Phase 7 — Commercial Launch Hardening](#10-phase-7--commercial-launch-hardening)
11. [Samsung Galaxy S20 FE (Termux) Deployment](#11-samsung-galaxy-s20-fe-termux-deployment)
12. [Docker Deployment](#12-docker-deployment)
13. [Testing Strategy](#13-testing-strategy)
14. [File-by-File Change Manifest](#14-file-by-file-change-manifest)
15. [Verification & Acceptance Criteria](#15-verification--acceptance-criteria)

---

## 1. Current State Audit

### 1.1 What Already Exists (✅ Solid Foundation)

The codebase is a **well-structured Next.js 14.2 App Router** project with significant work already done:

| Layer | Status | Files |
|-------|--------|-------|
| **Prisma Schema** | ✅ 22 models defined | [schema.prisma](file:///C:/Projects/stixnvibes-nv/prisma/schema.prisma) |
| **Supabase SQL Schema** | ✅ Comprehensive tables + RLS | [schema.sql](file:///C:/Projects/stixnvibes-nv/supabase/schema.sql) |
| **Storefront Pages** | ✅ Home, Shop, Product, Cart, Checkout, Account, Tracking | `src/app/` |
| **Admin Dashboard** | ✅ Orders, Products, Customers, Inventory, Production, QC, Packing, Shipping | `src/app/admin/` |
| **Pricing Engine** | ✅ Server-side calculation with modifiers | `src/lib/pricing/` |
| **Checkout Service** | ⚠️ Exists but non-atomic inventory | `src/lib/checkout/` |
| **Order State Machine** | ⚠️ Exists but mixed-case states | `src/lib/orders/state-machine.ts` |
| **Inventory Service** | ⚠️ Exists but no concurrency protection | `src/lib/inventory/` |
| **Payment (Razorpay)** | ⚠️ Env-gated, webhook handler exists | `src/lib/payment/razorpay.ts` |
| **WhatsApp Integration** | ✅ Direct checkout + notifications | `src/lib/whatsapp/` |
| **Cloudinary** | ✅ URL builder, loader, env-gated | `src/lib/cloudinary.ts` |
| **Cart Context** | ✅ localStorage persistence | `src/context/cart-context.tsx` |
| **UI Components** | ✅ Full shadcn/ui + brand system | `src/components/` |
| **Motion System** | ✅ Reveal, StaggerGroup helpers | `src/components/motion/` |
| **Tests** | ⚠️ 18 unit test files + E2E stubs | `tests/` |
| **Docker** | ✅ Dockerfile + compose | Root |
| **Netlify** | ✅ Config exists | `netlify.toml` |

### 1.2 Critical Gaps Identified

```text
┌─────────────────────────────────────────────────────────────────────┐
│  GAP                              │ SEVERITY  │ PHASE TO FIX       │
├───────────────────────────────────┼───────────┼────────────────────┤
│  Inventory race condition         │ CRITICAL  │ Phase 1            │
│  No atomic stock reservation      │ CRITICAL  │ Phase 1            │
│  No price snapshots on OrderItem  │ HIGH      │ Phase 1            │
│  Mixed-case order states          │ HIGH      │ Phase 1            │
│  Reservation expiry missing       │ HIGH      │ Phase 1            │
│  Webhook idempotency missing      │ CRITICAL  │ Phase 2            │
│  Payment duplicate protection     │ CRITICAL  │ Phase 2            │
│  QC→Packing→Ship flow incomplete  │ MEDIUM    │ Phase 3            │
│  No structured logging            │ MEDIUM    │ Phase 5            │
│  No correlation IDs               │ LOW       │ Phase 5            │
│  Real DB integration tests        │ HIGH      │ Phase 6            │
│  Concurrency test is stub         │ HIGH      │ Phase 1            │
│  No migration tooling             │ MEDIUM    │ Phase 7            │
│  No backup strategy               │ MEDIUM    │ Phase 7            │
│  No health check endpoints        │ LOW       │ Phase 5            │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Existing Database Models (Prisma)

The Prisma schema already defines these models:

```text
Product, ProductVariant, ProductImage, Category, Collection,
CollectionProduct, Material, Paper, Size, ProductMaterial,
ProductSize, Order, OrderItem, Customer, CustomerAddress,
InventoryLedger, InventoryReservation, QualityControl,
ProductionJob, Shipment, Payment, StoreSettings, Page,
Navigation, NavigationItem, HomepageSection, MediaAsset,
AuditLog, Tag, ProductTag
```

**Enums defined in Prisma:**
```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  PAID
  PRODUCTION
  PRINTING
  QC
  PACKING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentProvider {
  RAZORPAY
  WHATSAPP_COD
  MANUAL
}
```

> [!WARNING]
> **Mixed-case state issue**: The state machine in `src/lib/orders/state-machine.ts` uses a `VALID_TRANSITIONS` map, but runtime code and tests reference both `PAID`/`paid`, `PRINTING`/`printing` etc. This must be unified to the Prisma enum (UPPER_CASE) as the single authority.

### 1.4 Existing Order State Machine

From [state-machine.ts](file:///C:/Projects/stixnvibes-nv/src/lib/orders/state-machine.ts):

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PAID', 'CANCELLED'],
  PAID:       ['PRODUCTION', 'CANCELLED'],
  PRODUCTION: ['PRINTING'],
  PRINTING:   ['QC'],
  QC:         ['PACKING', 'PRODUCTION'],  // QC fail → rework
  PACKING:    ['SHIPPED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  [],
  CANCELLED:  [],
  REFUNDED:   [],
};
```

### 1.5 Existing Pricing Engine

From `src/lib/pricing/`:
- `calculatePrice()` — resolves base price + material modifier + size modifier + quantity tier
- Server-side only, called during checkout
- **Gap**: No snapshot persisted on OrderItem at creation time

### 1.6 Existing Checkout Flow

From `src/lib/checkout/`:
```text
Client cart → POST /api/checkout → validateCart() → calculatePrice() 
  → check stock (non-atomic READ) → create Order + OrderItems 
  → decrement stock (separate operation) → return order
```

> [!CAUTION]
> **Race condition**: Stock is read before the transactional decrement. Two simultaneous purchases of the last unit can both succeed. This is the #1 technical priority.

---

## 2. Architecture Target

```mermaid
graph TB
    subgraph "STOREFRONT (Customer)"
        H[Home]
        S[Shop/Collections/Categories]
        P[Product Detail]
        CZ[Customizer]
        CT[Cart]
        CO[Checkout]
        A[Account]
        T[Tracking]
    end

    subgraph "MERCHANT ADMIN"
        DA[Dashboard]
        CA[Catalog - Products/Variants/Materials/Sizes]
        CU[Customers CRM]
        OR[Orders]
        PR[Production Queue]
        QC[Quality Control]
        PK[Packing]
        SH[Shipping]
        IV[Inventory]
        ME[Media Library]
        HP[Homepage Builder]
        PG[Pages]
        NV[Navigation]
        TH[Theme/Branding]
        AN[Analytics]
        SE[Settings]
    end

    subgraph "BUSINESS SERVICES"
        PS[Pricing Service]
        CS[Checkout Service]
        IS[Inventory Service]
        OS[Order Service + State Machine]
        PRS[Production Service]
        QCS[QC Service]
        SS[Shipping Service]
        CUS[Customer Service]
        AS[Analytics Service]
    end

    subgraph "INTEGRATIONS"
        SU[Supabase Auth + DB]
        RP[Razorpay]
        WA[WhatsApp]
        CL[Cloudinary]
        CR[Courier API]
    end

    subgraph "DATABASE (PostgreSQL)"
        direction LR
        DB1[Products/Variants/Catalog]
        DB2[Orders/OrderItems]
        DB3[Inventory/Reservations/Ledger]
        DB4[Customers/Addresses]
        DB5[Payments]
        DB6[Production/QC/Shipments]
        DB7[Content/Settings/Audit]
    end

    CO --> CS
    CS --> PS
    CS --> IS
    CS --> OS
    OS --> PRS
    PRS --> QCS
    QCS --> PK
    PK --> SS

    CS --> SU
    CS --> RP
    CS --> WA
    ME --> CL
    SS --> CR
```

### 2.1 Canonical Directory Structure (Target)

```text
src/
├── app/
│   ├── (storefront)/              # Customer-facing routes
│   │   ├── page.tsx               # Homepage
│   │   ├── shop/
│   │   │   ├── page.tsx           # Shop index with filters
│   │   │   └── [slug]/page.tsx    # Product detail
│   │   ├── collections/
│   │   │   └── [slug]/page.tsx
│   │   ├── categories/
│   │   │   └── [slug]/page.tsx
│   │   ├── customize/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── account/
│   │   │   ├── page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   └── orders/[id]/page.tsx
│   │   └── tracking/[id]/page.tsx
│   │
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Dashboard
│   │   ├── catalog/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── collections/
│   │   │   ├── materials/
│   │   │   └── sizes/
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── production/
│   │   ├── qc/
│   │   ├── packing/
│   │   ├── shipping/
│   │   ├── inventory/
│   │   ├── media/
│   │   ├── homepage/
│   │   ├── pages/
│   │   ├── navigation/
│   │   ├── theme/
│   │   ├── analytics/
│   │   └── settings/
│   │
│   └── api/
│       ├── checkout/route.ts
│       ├── payments/
│       │   ├── create/route.ts
│       │   ├── verify/route.ts
│       │   └── webhook/route.ts
│       ├── orders/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── transition/route.ts
│       ├── inventory/
│       │   ├── route.ts
│       │   └── reservations/route.ts
│       ├── products/route.ts
│       ├── customers/route.ts
│       ├── media/route.ts
│       ├── admin/
│       │   ├── dashboard/route.ts
│       │   └── settings/route.ts
│       └── health/route.ts
│
├── components/
│   ├── ui/                        # shadcn/ui primitives (existing)
│   ├── layout/                    # Shell components (existing)
│   ├── motion/                    # Animation helpers (existing)
│   ├── home/                      # Homepage sections (existing)
│   ├── product/                   # Product display (existing)
│   ├── theme/                     # Theme provider (existing)
│   ├── cart/                      # Cart drawer/components
│   ├── checkout/                  # Checkout form components
│   ├── admin/                     # Admin-specific components
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── production/
│   │   ├── qc/
│   │   ├── inventory/
│   │   └── shared/
│   └── shared/                    # Cross-cutting (pagination, etc.)
│
├── context/
│   ├── cart-context.tsx           # (existing)
│   └── auth-context.tsx           # (to add)
│
├── lib/
│   ├── services/                  # Business services
│   │   ├── pricing.service.ts
│   │   ├── checkout.service.ts
│   │   ├── inventory.service.ts
│   │   ├── order.service.ts
│   │   ├── production.service.ts
│   │   ├── qc.service.ts
│   │   ├── shipping.service.ts
│   │   ├── customer.service.ts
│   │   └── analytics.service.ts
│   │
│   ├── state-machine/
│   │   └── order-state-machine.ts
│   │
│   ├── repositories/              # Data access layer
│   │   ├── product.repository.ts
│   │   ├── order.repository.ts
│   │   ├── inventory.repository.ts
│   │   ├── customer.repository.ts
│   │   └── base.repository.ts
│   │
│   ├── integrations/              # External provider adapters
│   │   ├── razorpay.ts
│   │   ├── whatsapp.ts
│   │   ├── cloudinary.ts
│   │   └── courier.ts
│   │
│   ├── prisma/
│   │   └── client.ts              # Prisma singleton
│   │
│   ├── supabase/
│   │   ├── client.ts
│   │   └── service.ts
│   │
│   ├── data/                      # Mock/seed data (existing)
│   ├── site-config.ts             # (existing)
│   └── utils.ts                   # (existing)
│
├── middleware.ts
└── types/
    ├── product.ts
    ├── order.ts
    ├── cart.ts
    ├── customer.ts
    ├── inventory.ts
    └── index.ts
```

---

## 3. Deployment Targets

### 3.1 Primary: Samsung Galaxy S20 FE (Termux)

```text
Device:   Samsung Galaxy S20 FE
SoC:      Exynos 990 / Snapdragon 865
RAM:      6GB / 8GB
Storage:  128GB / 256GB
OS:       Android 13+ (One UI 5+)
Runtime:  Termux + proot-distro (Ubuntu/Debian)
```

All services run under a single directory on the phone:

```text
~/stixnvibes/
├── app/                    # Next.js application
├── postgres-data/          # PostgreSQL data directory
├── backups/                # Automated DB backups
├── logs/                   # Application + DB logs
├── .env                    # Environment configuration
├── start.sh                # Master startup script
├── stop.sh                 # Graceful shutdown
├── backup.sh               # Manual backup trigger
├── health-check.sh         # Health verification
└── README-TERMUX.md        # Termux-specific instructions
```

### 3.2 Secondary: Netlify + Supabase (Production)

```text
Frontend:   Netlify (Next.js SSR via @netlify/plugin-nextjs)
Database:   Supabase Managed PostgreSQL
Auth:       Supabase Auth
Storage:    Cloudinary (media) + Supabase Storage (backups)
Payments:   Razorpay
Messaging:  WhatsApp Business API
```

### 3.3 Tertiary: Docker Containerised

```text
docker-compose.yml with:
  - app (Next.js)
  - postgres (PostgreSQL 15)
  - (optional) redis for session/cache
```

---

## 4. Phase 1 — Transactional Correctness

> **Priority**: 🔴 CRITICAL  
> **Goal**: Make inventory, orders, and pricing transactionally reliable  
> **Estimated Effort**: 5-7 working days

### 4.1 Canonical Order State Enum

> [!IMPORTANT]
> **Business Decision Required**: Confirm the canonical order states before implementation.

**Proposed canonical states:**

```typescript
// src/lib/state-machine/order-state-machine.ts

export enum OrderStatus {
  // Happy path
  PENDING     = 'PENDING',       // Order created, awaiting confirmation
  CONFIRMED   = 'CONFIRMED',     // Admin confirmed, awaiting payment
  PAID        = 'PAID',          // Payment received/verified
  PRODUCTION  = 'PRODUCTION',    // Sent to production queue
  PRINTING    = 'PRINTING',      // Actively printing/manufacturing
  QC          = 'QC',            // Quality control inspection
  PACKING     = 'PACKING',       // Being packed for shipment
  SHIPPED     = 'SHIPPED',       // Handed to courier
  DELIVERED   = 'DELIVERED',     // Delivery confirmed

  // Exceptional states
  CANCELLED          = 'CANCELLED',          // Cancelled (any pre-ship stage)
  PAYMENT_FAILED     = 'PAYMENT_FAILED',     // Payment attempt failed
  QC_FAILED          = 'QC_FAILED',          // Failed quality control
  RETURN_REQUESTED   = 'RETURN_REQUESTED',   // Customer requested return
  RETURNED           = 'RETURNED',           // Return completed
  REFUNDED           = 'REFUNDED',           // Refund processed
}
```

**Proposed transition map:**

```typescript
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]:           [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]:         [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.PAYMENT_FAILED],
  [OrderStatus.PAID]:              [OrderStatus.PRODUCTION, OrderStatus.CANCELLED],
  [OrderStatus.PRODUCTION]:        [OrderStatus.PRINTING, OrderStatus.CANCELLED],
  [OrderStatus.PRINTING]:          [OrderStatus.QC],
  [OrderStatus.QC]:                [OrderStatus.PACKING, OrderStatus.QC_FAILED],
  [OrderStatus.PACKING]:           [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]:           [OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED],
  [OrderStatus.DELIVERED]:         [OrderStatus.RETURN_REQUESTED],

  // Exceptional
  [OrderStatus.CANCELLED]:         [OrderStatus.REFUNDED],
  [OrderStatus.PAYMENT_FAILED]:    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.QC_FAILED]:         [OrderStatus.PRODUCTION],  // rework
  [OrderStatus.RETURN_REQUESTED]:  [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]:          [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]:          [],  // terminal
};
```

**State Machine service functions:**

```typescript
// src/lib/state-machine/order-state-machine.ts

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStates(current: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

export function isTerminal(status: OrderStatus): boolean {
  return (VALID_TRANSITIONS[status] ?? []).length === 0;
}

export function isCancellable(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status]?.includes(OrderStatus.CANCELLED) ?? false;
}

export function requiresInventoryRelease(from: OrderStatus, to: OrderStatus): boolean {
  const releaseTransitions = [
    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PRODUCTION, OrderStatus.CANCELLED],
  ];
  return releaseTransitions.some(([f, t]) => f === from && t === to);
}
```

#### Files to modify/create:

| Action | File | Changes |
|--------|------|---------|
| **[REWRITE]** | `src/lib/orders/state-machine.ts` → `src/lib/state-machine/order-state-machine.ts` | Replace string-based map with typed enum, add helper functions |
| **[MODIFY]** | `prisma/schema.prisma` | Update `OrderStatus` enum to include `PAYMENT_FAILED`, `QC_FAILED`, `RETURN_REQUESTED`, `RETURNED` |
| **[MODIFY]** | `supabase/schema.sql` | Mirror enum changes in SQL |
| **[MODIFY]** | All admin pages referencing order status | Use canonical `OrderStatus` enum |
| **[MODIFY]** | All API routes doing status transitions | Validate via `canTransition()` |

---

### 4.2 Atomic Inventory Reservation

> [!CAUTION]
> This is the **#1 technical priority**. The current code reads stock, then decrements in a separate operation. Two simultaneous purchases of the last unit can both succeed.

**Current (broken) flow:**
```text
1. READ stock level → stockAvailable = 5
2. IF stockAvailable >= requestedQty → proceed
3. CREATE order
4. UPDATE stock -= requestedQty        ← RACE CONDITION: another request read 5 too
```

**Target (atomic) flow:**
```text
1. BEGIN TRANSACTION
2. SELECT stock FROM inventory WHERE variant_id = ? FOR UPDATE  ← row lock
3. IF stock < requestedQty → ROLLBACK, return error
4. UPDATE stock -= requestedQty (or INSERT reservation)
5. INSERT order + order_items with price snapshots
6. INSERT inventory_ledger entry
7. COMMIT
```

**Implementation using Prisma interactive transactions:**

```typescript
// src/lib/services/inventory.service.ts

import { prisma } from '@/lib/prisma/client';
import { Prisma } from '@prisma/client';

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  error?: string;
}

export async function reserveStock(
  variantId: string,
  quantity: number,
  orderId: string,
  expiresInMinutes: number = 30
): Promise<ReservationResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the variant row and read current stock
    const [variant] = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
      SELECT id, stock FROM "ProductVariant"
      WHERE id = ${variantId}
      FOR UPDATE
    `;

    if (!variant) {
      throw new Error(`Variant ${variantId} not found`);
    }

    // 2. Check availability
    if (variant.stock < quantity) {
      return {
        success: false,
        error: `Insufficient stock: ${variant.stock} available, ${quantity} requested`,
      };
    }

    // 3. Decrement stock atomically
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { decrement: quantity } },
    });

    // 4. Create reservation record
    const reservation = await tx.inventoryReservation.create({
      data: {
        variantId,
        orderId,
        quantity,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      },
    });

    // 5. Create ledger entry
    await tx.inventoryLedger.create({
      data: {
        variantId,
        orderId,
        type: 'RESERVATION',
        quantity: -quantity,
        previousStock: variant.stock,
        newStock: variant.stock - quantity,
        reason: `Stock reserved for order ${orderId}`,
      },
    });

    return { success: true, reservationId: reservation.id };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 10000,
  });
}

export async function releaseReservation(
  reservationId: string,
  reason: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation || reservation.status !== 'ACTIVE') return;

    // Restore stock
    await tx.productVariant.update({
      where: { id: reservation.variantId },
      data: { stock: { increment: reservation.quantity } },
    });

    // Mark reservation as released
    await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    // Ledger entry
    const variant = await tx.productVariant.findUnique({
      where: { id: reservation.variantId },
    });

    await tx.inventoryLedger.create({
      data: {
        variantId: reservation.variantId,
        orderId: reservation.orderId,
        type: 'RELEASE',
        quantity: reservation.quantity,
        previousStock: (variant?.stock ?? 0) - reservation.quantity,
        newStock: variant?.stock ?? 0,
        reason,
      },
    });
  });
}
```

**Reservation expiry (background job or API route):**

```typescript
// src/lib/services/inventory.service.ts (continued)

export async function expireStaleReservations(): Promise<number> {
  const expired = await prisma.inventoryReservation.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lt: new Date() },
    },
  });

  for (const reservation of expired) {
    await releaseReservation(reservation.id, 'Reservation expired');
  }

  return expired.length;
}
```

**Cron endpoint for Termux/self-hosted:**

```typescript
// src/app/api/cron/expire-reservations/route.ts

import { expireStaleReservations } from '@/lib/services/inventory.service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const released = await expireStaleReservations();
  return NextResponse.json({ released, timestamp: new Date().toISOString() });
}
```

#### Prisma Schema Changes:

```prisma
// Add to prisma/schema.prisma

model InventoryReservation {
  id          String   @id @default(cuid())
  variantId   String
  orderId     String?
  quantity    Int
  status      ReservationStatus @default(ACTIVE)
  expiresAt   DateTime
  releasedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  variant     ProductVariant @relation(fields: [variantId], references: [id])
  order       Order?         @relation(fields: [orderId], references: [id])

  @@index([status, expiresAt])
  @@index([variantId])
  @@index([orderId])
}

enum ReservationStatus {
  ACTIVE
  COMMITTED     // Converted to confirmed order
  RELEASED      // Manually released or cancelled
  EXPIRED       // Expired by background job
}

model InventoryLedger {
  id            String   @id @default(cuid())
  variantId     String
  orderId       String?
  type          LedgerEntryType
  quantity      Int        // positive = stock in, negative = stock out
  previousStock Int
  newStock      Int
  reason        String?
  createdAt     DateTime @default(now())

  variant       ProductVariant @relation(fields: [variantId], references: [id])
  order         Order?         @relation(fields: [orderId], references: [id])

  @@index([variantId, createdAt])
  @@index([orderId])
}

enum LedgerEntryType {
  RESERVATION
  RELEASE
  COMMITMENT
  ADJUSTMENT
  RETURN
  RESTOCK
}
```

#### Files to modify/create:

| Action | File | Changes |
|--------|------|---------|
| **[MODIFY]** | `prisma/schema.prisma` | Add/update `InventoryReservation`, `InventoryLedger`, enums |
| **[NEW]** | `src/lib/services/inventory.service.ts` | Atomic reserve, release, expire functions |
| **[NEW]** | `src/app/api/cron/expire-reservations/route.ts` | Background expiry endpoint |
| **[MODIFY]** | `src/lib/checkout/` (existing checkout service) | Wire in `reserveStock()` inside transaction |
| **[MODIFY]** | `supabase/schema.sql` | Mirror schema changes |

---

### 4.3 Price Snapshots on OrderItem

**Current gap**: `OrderItem` references a product but doesn't permanently record the price at purchase time. If a product price changes later, historical orders show the new price.

**Solution**: Add price snapshot fields directly to `OrderItem`.

```prisma
// Modify OrderItem in prisma/schema.prisma

model OrderItem {
  id              String   @id @default(cuid())
  orderId         String
  productId       String
  variantId       String?
  quantity        Int
  
  // === PRICE SNAPSHOT (new fields) ===
  unitPrice       Float    // Base price at time of purchase
  materialModifier Float   @default(0)  // Material price modifier
  sizeModifier    Float    @default(0)  // Size price modifier
  discountAmount  Float    @default(0)  // Discount applied
  taxAmount       Float    @default(0)  // Tax applied
  lineTotal       Float    // Final line total (quantity * (unitPrice + modifiers) - discount + tax)
  
  // Snapshot metadata
  productName     String   // Product name at purchase time
  variantName     String?  // Variant name at purchase time
  materialName    String?  // Material name if customised
  sizeName        String?  // Size name if customised
  customization   Json?    // Full customisation snapshot
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           Order    @relation(fields: [orderId], references: [id])
  product         Product  @relation(fields: [productId], references: [id])
  variant         ProductVariant? @relation(fields: [variantId], references: [id])
}
```

**Checkout service changes:**

```typescript
// Inside checkout transaction, when creating OrderItems:

const priceResult = calculatePrice({
  basePrice: product.price,
  materialModifier: selectedMaterial?.priceModifier ?? 0,
  sizeModifier: selectedSize?.priceModifier ?? 0,
  quantity: item.quantity,
  discountPercent: applicableDiscount?.percent ?? 0,
  taxRate: storeTaxRate,
});

const orderItem = await tx.orderItem.create({
  data: {
    orderId: order.id,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    // Price snapshot
    unitPrice: product.price,
    materialModifier: selectedMaterial?.priceModifier ?? 0,
    sizeModifier: selectedSize?.priceModifier ?? 0,
    discountAmount: priceResult.discountAmount,
    taxAmount: priceResult.taxAmount,
    lineTotal: priceResult.lineTotal,
    // Name snapshots
    productName: product.name,
    variantName: variant?.name ?? null,
    materialName: selectedMaterial?.name ?? null,
    sizeName: selectedSize?.name ?? null,
    customization: item.customization ?? null,
  },
});
```

#### Files to modify:

| Action | File | Changes |
|--------|------|---------|
| **[MODIFY]** | `prisma/schema.prisma` | Add snapshot fields to `OrderItem` |
| **[MODIFY]** | `src/lib/checkout/` | Populate snapshot fields during order creation |
| **[MODIFY]** | `src/app/admin/orders/` | Display snapshot values, not current product values |
| **[MODIFY]** | `src/app/(storefront)/account/orders/` | Display snapshot values |
| **[MODIFY]** | `supabase/schema.sql` | Mirror column additions |

---

### 4.4 Reservation Business Logic

> [!IMPORTANT]
> **Business Decision Required**: When does inventory get reserved/committed?

**Recommended model for Stix N Vibes:**

```text
┌──────────────────────────────────────────────────────────────────┐
│                    INVENTORY LIFECYCLE                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Customer submits checkout                                       │
│       │                                                          │
│       ▼                                                          │
│  TEMPORARY RESERVATION (30 min expiry)                           │
│  └── Stock decremented, reservation ACTIVE                       │
│       │                                                          │
│       ├── Admin confirms → RESERVATION stays ACTIVE              │
│       │       │                                                  │
│       │       ▼                                                  │
│       │   Payment received                                       │
│       │       │                                                  │
│       │       ▼                                                  │
│       │   COMMITTED (reservation → COMMITTED, permanent)         │
│       │                                                          │
│       ├── Customer cancels before payment                        │
│       │       │                                                  │
│       │       ▼                                                  │
│       │   RELEASED (stock restored)                              │
│       │                                                          │
│       └── Reservation expires (no payment in 30 min)             │
│               │                                                  │
│               ▼                                                  │
│           EXPIRED (stock restored by background job)             │
│                                                                  │
│  Returns:                                                        │
│       Return approved → stock RESTOCKED (ledger entry)           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 4.5 Phase 1 Unit Tests

These are the **most important business tests** for Phase 1:

```typescript
// tests/inventory-concurrency.test.ts

describe('Inventory Concurrency', () => {
  it('should allow only one of two simultaneous purchases for the last unit', async () => {
    // Setup: Create variant with stock = 1
    // Execute: Two concurrent reserveStock() calls
    // Assert: Exactly one succeeds, exactly one fails
    // Assert: Final stock = 0
    // Assert: Exactly one reservation ACTIVE
    // Assert: Exactly one ledger entry
  });

  it('should correctly handle concurrent purchases for limited stock', async () => {
    // Setup: Create variant with stock = 3
    // Execute: Five concurrent reserveStock() calls for qty=1
    // Assert: Exactly 3 succeed, exactly 2 fail
    // Assert: Final stock = 0
  });
});

// tests/price-snapshot.test.ts

describe('Price Snapshots', () => {
  it('should preserve original price when product price changes', async () => {
    // Setup: Product at ₹249
    // Execute: Create order
    // Execute: Change product price to ₹399
    // Assert: OrderItem.unitPrice still = 249
    // Assert: OrderItem.lineTotal reflects original price
  });

  it('should preserve material modifier at time of purchase', async () => {
    // Setup: Material with +₹50 modifier
    // Execute: Create order with material
    // Execute: Change material modifier to +₹100
    // Assert: OrderItem.materialModifier still = 50
  });
});

// tests/order-state-machine.test.ts

describe('Order State Machine', () => {
  it('should only allow valid transitions', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false);
    expect(canTransition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(false);
  });

  it('should not allow skipping states', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.PAID)).toBe(false);
    expect(canTransition(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(false);
  });

  it('should allow cancellation from pre-ship states only', () => {
    expect(isCancellable(OrderStatus.PENDING)).toBe(true);
    expect(isCancellable(OrderStatus.CONFIRMED)).toBe(true);
    expect(isCancellable(OrderStatus.PAID)).toBe(true);
    expect(isCancellable(OrderStatus.SHIPPED)).toBe(false);
    expect(isCancellable(OrderStatus.DELIVERED)).toBe(false);
  });

  it('should trigger inventory release on cancellation', () => {
    expect(requiresInventoryRelease(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
    expect(requiresInventoryRelease(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
  });

  it('should handle QC failure → rework path', () => {
    expect(canTransition(OrderStatus.QC, OrderStatus.QC_FAILED)).toBe(true);
    expect(canTransition(OrderStatus.QC_FAILED, OrderStatus.PRODUCTION)).toBe(true);
  });

  it('should recognize terminal states', () => {
    expect(isTerminal(OrderStatus.DELIVERED)).toBe(false); // can request return
    expect(isTerminal(OrderStatus.REFUNDED)).toBe(true);
  });
});

// tests/reservation-expiry.test.ts

describe('Reservation Expiry', () => {
  it('should expire stale reservations and restore stock', async () => {
    // Setup: Create reservation that expired 1 minute ago
    // Execute: expireStaleReservations()
    // Assert: Reservation status = EXPIRED
    // Assert: Stock restored
    // Assert: Ledger entry created
  });

  it('should not expire non-expired reservations', async () => {
    // Setup: Create reservation expiring in 29 minutes
    // Execute: expireStaleReservations()
    // Assert: Reservation still ACTIVE
    // Assert: Stock unchanged
  });
});

// tests/checkout-transaction.test.ts

describe('Checkout Transaction', () => {
  it('should create order with price snapshots atomically', async () => {
    // Setup: Product + variant + stock
    // Execute: checkout()
    // Assert: Order created
    // Assert: OrderItems have correct price snapshots
    // Assert: Inventory decremented
    // Assert: Reservation created
    // Assert: Ledger entry created
    // Assert: All in single transaction
  });

  it('should rollback entire transaction on insufficient stock', async () => {
    // Setup: Product with stock = 0
    // Execute: checkout()
    // Assert: No order created
    // Assert: No inventory changes
    // Assert: No reservations
    // Assert: Error returned
  });

  it('should not allow client to manipulate price', async () => {
    // Setup: Product at ₹299
    // Execute: checkout() with client sending price = ₹1
    // Assert: OrderItem.unitPrice = 299 (server-calculated)
    // Assert: lineTotal based on server price
  });
});
```

---

## 5. Phase 2 — Payment Correctness

> **Priority**: 🔴 CRITICAL  
> **Goal**: Make Razorpay integration reliable, idempotent, and fraud-resistant  
> **Estimated Effort**: 3-4 working days

### 5.1 Razorpay Order Creation

```typescript
// src/lib/integrations/razorpay.ts

import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createRazorpayOrder(
  orderId: string,
  amountPaise: number,  // Amount in paise (₹299 = 29900)
  currency: string = 'INR'
): Promise<{ razorpayOrderId: string }> {
  // Idempotency: check if Razorpay order already exists for this order
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId, provider: 'RAZORPAY', providerOrderId: { not: null } },
  });

  if (existingPayment?.providerOrderId) {
    return { razorpayOrderId: existingPayment.providerOrderId };
  }

  const rpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt: orderId,
    notes: { stixnvibes_order_id: orderId },
  });

  // Persist payment record
  await prisma.payment.create({
    data: {
      orderId,
      provider: 'RAZORPAY',
      providerOrderId: rpOrder.id,
      amount: amountPaise / 100,
      currency,
      status: 'PENDING',
    },
  });

  return { razorpayOrderId: rpOrder.id };
}
```

### 5.2 Webhook Handler (Idempotent)

```typescript
// src/app/api/payments/webhook/route.ts

import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { prisma } from '@/lib/prisma/client';
import { OrderStatus } from '@/lib/state-machine/order-state-machine';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  // 1. Verify signature
  if (!validateWebhookSignature(body, signature!, webhookSecret)) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);

  // 2. Idempotency check — have we already processed this event?
  const eventId = event.event_id || `${event.event}-${event.payload?.payment?.entity?.id}`;

  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: { eventId },
  });

  if (existingEvent) {
    // Already processed — return 200 to prevent retry
    return new Response('Already processed', { status: 200 });
  }

  // 3. Record event BEFORE processing (at-least-once)
  await prisma.paymentWebhookEvent.create({
    data: {
      eventId,
      eventType: event.event,
      payload: event,
      status: 'PROCESSING',
    },
  });

  try {
    // 4. Process payment event
    if (event.event === 'payment.captured') {
      await handlePaymentCaptured(event.payload.payment.entity);
    } else if (event.event === 'payment.failed') {
      await handlePaymentFailed(event.payload.payment.entity);
    }

    // 5. Mark event as processed
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  } catch (error) {
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: { status: 'FAILED', error: String(error) },
    });
    throw error;
  }

  return new Response('OK', { status: 200 });
}

async function handlePaymentCaptured(payment: any) {
  const rpOrderId = payment.order_id;

  await prisma.$transaction(async (tx) => {
    // Find our payment record
    const paymentRecord = await tx.payment.findFirst({
      where: { providerOrderId: rpOrderId },
      include: { order: true },
    });

    if (!paymentRecord) throw new Error(`No payment for RP order ${rpOrderId}`);

    // Idempotency: if already COMPLETED, skip
    if (paymentRecord.status === 'COMPLETED') return;

    // Verify amount matches
    if (payment.amount !== paymentRecord.amount * 100) {
      throw new Error(`Amount mismatch: expected ${paymentRecord.amount * 100}, got ${payment.amount}`);
    }

    // Update payment status
    await tx.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: 'COMPLETED',
        providerPaymentId: payment.id,
        paidAt: new Date(),
      },
    });

    // Transition order to PAID
    if (paymentRecord.order.status === 'CONFIRMED') {
      await tx.order.update({
        where: { id: paymentRecord.orderId },
        data: { status: OrderStatus.PAID },
      });

      // Commit reservation (convert from temporary to permanent)
      await tx.inventoryReservation.updateMany({
        where: { orderId: paymentRecord.orderId, status: 'ACTIVE' },
        data: { status: 'COMMITTED' },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          entityType: 'Order',
          entityId: paymentRecord.orderId,
          action: 'PAYMENT_CAPTURED',
          details: { paymentId: payment.id, amount: payment.amount },
        },
      });
    }
  });
}
```

### 5.3 Schema Additions for Payment

```prisma
// Add to prisma/schema.prisma

model PaymentWebhookEvent {
  id          String   @id @default(cuid())
  eventId     String   @unique    // Razorpay event ID for idempotency
  eventType   String
  payload     Json
  status      String   @default("PROCESSING")  // PROCESSING, PROCESSED, FAILED
  processedAt DateTime?
  error       String?
  createdAt   DateTime @default(now())

  @@index([eventId])
  @@index([status])
}

// Update Payment model:
model Payment {
  id                String        @id @default(cuid())
  orderId           String
  provider          PaymentProvider
  providerOrderId   String?       // Razorpay order_id
  providerPaymentId String?       // Razorpay payment_id
  amount            Float
  currency          String        @default("INR")
  status            PaymentStatus @default(PENDING)
  paidAt            DateTime?
  failureReason     String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  order             Order         @relation(fields: [orderId], references: [id])

  @@index([providerOrderId])
  @@index([orderId])
}
```

### 5.4 Phase 2 Unit Tests

```typescript
// tests/payment-webhook.test.ts

describe('Payment Webhook Idempotency', () => {
  it('should process a payment.captured webhook exactly once', async () => {
    // Execute: Send same webhook event twice
    // Assert: Order transitions to PAID only once
    // Assert: Second call returns 200 but makes no changes
    // Assert: Only one PaymentWebhookEvent record
  });

  it('should reject webhook with invalid signature', async () => {
    // Execute: Send webhook with wrong signature
    // Assert: Returns 400
    // Assert: No payment changes
  });

  it('should reject webhook with mismatched amount', async () => {
    // Setup: Payment for ₹299
    // Execute: Webhook says ₹100
    // Assert: Error thrown, payment not updated
  });

  it('should not create fulfilled order from failed payment', async () => {
    // Execute: payment.failed webhook
    // Assert: Order does NOT move to PAID
    // Assert: Order status = PAYMENT_FAILED
    // Assert: Reservation released
  });

  it('should handle payment.captured for already-paid order', async () => {
    // Setup: Order already PAID
    // Execute: Another payment.captured webhook
    // Assert: No duplicate state change
    // Assert: Returns 200
  });
});

// tests/payment-creation.test.ts

describe('Razorpay Order Creation', () => {
  it('should create Razorpay order with server-calculated amount', async () => {
    // Assert: Amount comes from server pricing, not client
  });

  it('should return existing Razorpay order on retry (idempotent)', async () => {
    // Execute: Create Razorpay order twice for same order
    // Assert: Same rpOrderId returned
    // Assert: Only one Payment record
  });
});
```

---

## 6. Phase 3 — Complete Operational Workflow

> **Priority**: 🟡 HIGH  
> **Goal**: Complete the order journey from checkout through delivery, including failure/rework/cancellation paths  
> **Estimated Effort**: 5-6 working days

### 6.1 Order Transition Service

```typescript
// src/lib/services/order.service.ts

import { prisma } from '@/lib/prisma/client';
import { OrderStatus, canTransition, requiresInventoryRelease } from '@/lib/state-machine/order-state-machine';
import { releaseReservation } from '@/lib/services/inventory.service';

export interface TransitionResult {
  success: boolean;
  order?: any;
  error?: string;
}

export async function transitionOrder(
  orderId: string,
  targetStatus: OrderStatus,
  operatorId: string,
  notes?: string
): Promise<TransitionResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { reservations: true },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const currentStatus = order.status as OrderStatus;

    // Validate transition
    if (!canTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${currentStatus} to ${targetStatus}`,
      };
    }

    // Handle side effects
    if (requiresInventoryRelease(currentStatus, targetStatus)) {
      for (const reservation of order.reservations) {
        await releaseReservation(reservation.id, `Order cancelled: ${notes ?? 'no reason'}`);
      }
    }

    if (targetStatus === OrderStatus.PRODUCTION) {
      // Create production job
      await tx.productionJob.create({
        data: {
          orderId,
          status: 'QUEUED',
          priority: 'NORMAL',
        },
      });
    }

    if (targetStatus === OrderStatus.QC) {
      // Create QC record
      await tx.qualityControl.create({
        data: {
          orderId,
          status: 'PENDING',
        },
      });
    }

    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: targetStatus },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        entityType: 'Order',
        entityId: orderId,
        action: 'STATUS_TRANSITION',
        details: {
          from: currentStatus,
          to: targetStatus,
          operatorId,
          notes,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return { success: true, order: updatedOrder };
  });
}
```

### 6.2 Production Service

```typescript
// src/lib/services/production.service.ts

export async function completeProductionJob(
  jobId: string,
  operatorId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const job = await tx.productionJob.findUnique({
      where: { id: jobId },
      include: { order: true },
    });

    if (!job || job.status === 'COMPLETED') return;

    await tx.productionJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: operatorId,
      },
    });

    // Auto-transition order to QC
    await transitionOrder(job.orderId, OrderStatus.QC, operatorId, 'Production completed');
  });
}
```

### 6.3 QC Service

```typescript
// src/lib/services/qc.service.ts

export async function recordQcResult(
  qcId: string,
  result: 'PASS' | 'FAIL',
  operatorId: string,
  failureReason?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const qcRecord = await tx.qualityControl.findUnique({
      where: { id: qcId },
      include: { order: true },
    });

    if (!qcRecord) throw new Error('QC record not found');

    await tx.qualityControl.update({
      where: { id: qcId },
      data: {
        status: result === 'PASS' ? 'PASSED' : 'FAILED',
        inspectedBy: operatorId,
        inspectedAt: new Date(),
        failureReason: result === 'FAIL' ? failureReason : null,
      },
    });

    if (result === 'PASS') {
      await transitionOrder(qcRecord.orderId, OrderStatus.PACKING, operatorId, 'QC passed');
    } else {
      await transitionOrder(qcRecord.orderId, OrderStatus.QC_FAILED, operatorId, `QC failed: ${failureReason}`);
    }
  });
}
```

### 6.4 Shipping Service

```typescript
// src/lib/services/shipping.service.ts

export async function createShipment(
  orderId: string,
  courierName: string,
  awbNumber: string,
  operatorId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.shipment.create({
      data: {
        orderId,
        courierName,
        awbNumber,
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
        dispatchedBy: operatorId,
      },
    });

    await transitionOrder(orderId, OrderStatus.SHIPPED, operatorId, `AWB: ${awbNumber}`);
  });
}

export async function confirmDelivery(
  shipmentId: string,
  operatorId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) throw new Error('Shipment not found');

    await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });

    await transitionOrder(shipment.orderId, OrderStatus.DELIVERED, operatorId, 'Delivery confirmed');
  });
}
```

### 6.5 API Routes for Workflow

```typescript
// src/app/api/orders/[id]/transition/route.ts

import { transitionOrder } from '@/lib/services/order.service';
import { OrderStatus } from '@/lib/state-machine/order-state-machine';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // TODO: Auth check - verify admin role
  const body = await request.json();
  const { targetStatus, operatorId, notes } = body;

  if (!Object.values(OrderStatus).includes(targetStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const result = await transitionOrder(params.id, targetStatus, operatorId, notes);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ order: result.order });
}
```

### 6.6 Complete Workflow Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING: Customer submits checkout
    PENDING --> CONFIRMED: Admin confirms
    PENDING --> CANCELLED: Admin/Customer cancels

    CONFIRMED --> PAID: Payment captured
    CONFIRMED --> CANCELLED: Cancel before payment
    CONFIRMED --> PAYMENT_FAILED: Payment fails

    PAYMENT_FAILED --> CONFIRMED: Retry payment
    PAYMENT_FAILED --> CANCELLED: Give up

    PAID --> PRODUCTION: Send to production
    PAID --> CANCELLED: Cancel after payment (refund)

    PRODUCTION --> PRINTING: Start printing
    PRODUCTION --> CANCELLED: Cancel in production

    PRINTING --> QC: Printing complete

    QC --> PACKING: QC passes
    QC --> QC_FAILED: QC fails

    QC_FAILED --> PRODUCTION: Rework

    PACKING --> SHIPPED: Dispatch with AWB

    SHIPPED --> DELIVERED: Delivery confirmed
    SHIPPED --> RETURN_REQUESTED: Return request

    DELIVERED --> RETURN_REQUESTED: Post-delivery return

    RETURN_REQUESTED --> RETURNED: Return processed

    CANCELLED --> REFUNDED: Refund issued
    RETURNED --> REFUNDED: Refund issued

    REFUNDED --> [*]
```

### 6.7 Phase 3 Unit Tests

```typescript
// tests/operational-workflow.test.ts

describe('Complete Order Workflow', () => {
  it('should complete happy path: PENDING → DELIVERED', async () => {
    // Walk through every state transition
    // Assert each transition is valid and audit logged
  });

  it('should handle cancellation at each cancellable stage', async () => {
    // For each cancellable state:
    //   Assert cancellation works
    //   Assert inventory is released
    //   Assert audit log created
  });

  it('should handle QC failure → rework → pass → ship', async () => {
    // QC → QC_FAILED → PRODUCTION → PRINTING → QC → PACKING → SHIPPED
  });

  it('should prevent invalid transitions', async () => {
    // PENDING → SHIPPED (invalid)
    // DELIVERED → PENDING (invalid)
    // CANCELLED → PAID (invalid)
  });

  it('should prevent shipping without QC pass', async () => {
    // Attempt PRINTING → PACKING (skipping QC)
    // Assert: rejected
  });

  it('should release inventory on cancellation after payment', async () => {
    // PAID → CANCELLED
    // Assert: stock restored
    // Assert: ledger entry created
  });
});
```

---

## 7. Phase 4 — Admin Operational UX

> **Priority**: 🟡 HIGH  
> **Goal**: Ensure the merchant can perform every workflow operation without touching SQL  
> **Estimated Effort**: 4-5 working days

### 7.1 Dashboard (Actionable)

The dashboard should show:

```text
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD — What needs attention now                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔴 Pending Orders (3)          → Link to Orders (PENDING)      │
│  🟡 Awaiting Payment (2)        → Link to Orders (CONFIRMED)    │
│  🟢 In Production (5)           → Link to Production Queue      │
│  🔵 QC Pending (2)              → Link to QC                    │
│  📦 Ready to Pack (3)           → Link to Packing               │
│  🚚 Ready to Ship (1)           → Link to Shipping              │
│  ⚠️ Low Stock Alerts (4 items)  → Link to Inventory             │
│                                                                  │
│  Today: ₹12,450 revenue · 8 orders · 3 new customers           │
│  This Week: ₹67,200 revenue · 42 orders                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Files to modify/create:

| Action | File | Changes |
|--------|------|---------|
| **[MODIFY]** | `src/app/admin/page.tsx` | Real-time counts from DB, links to each module |
| **[NEW]** | `src/app/api/admin/dashboard/route.ts` | Dashboard metrics endpoint |
| **[NEW]** | `src/lib/services/analytics.service.ts` | Dashboard query functions |

### 7.2 Order Management UI Improvements

- Order detail page shows **complete timeline** (audit log entries)
- Only **valid next actions** shown as buttons (via `getNextStates()`)
- Confirmation dialogs for destructive actions (cancel, refund)
- Quick WhatsApp links (order confirmation, tracking)

### 7.3 Admin Module Checklist

| Module | Current State | Phase 4 Work |
|--------|---------------|--------------|
| Dashboard | ⚠️ Static counts | Wire to real DB queries |
| Products | ✅ CRUD exists | Add variants, materials, sizes inline editing |
| Categories | ⚠️ Basic | Add ordering, visibility toggle |
| Collections | ⚠️ Basic | Add product association UI |
| Customers | ✅ List + detail | Add CRM notes, order history, lifetime value |
| Orders | ✅ List + detail | Add timeline, valid-next-actions, cancel/refund flow |
| Production | ⚠️ Basic queue | Add batch operations, completion flow |
| QC | ⚠️ Basic | Add pass/fail with reason, image upload |
| Packing | ⚠️ Basic | Add checklist, invoice generation |
| Shipping | ⚠️ Basic | Add AWB entry, courier selection, tracking |
| Inventory | ✅ Stock view | Add adjustment form, ledger view, low-stock alerts |
| Media | ⚠️ Basic | Cloudinary upload, usage tracking |
| Homepage | ⚠️ Section list | Add reorder, visibility toggle, content edit |
| Pages | ⚠️ Basic | Add markdown editor, publish/draft, preview |
| Navigation | ⚠️ Basic | Add drag-reorder, link validation |
| Theme | ⚠️ Basic | Add color picker, logo upload, live preview |
| Analytics | ⚠️ Placeholder | Wire real revenue, orders, customers charts |
| Settings | ⚠️ Basic | Store info, tax config, payment config, WhatsApp |

---

## 8. Phase 5 — Observability

> **Priority**: 🟢 MEDIUM  
> **Goal**: Structured logging, correlation IDs, health checks, safe error handling  
> **Estimated Effort**: 2-3 working days

### 8.1 Structured Logger

```typescript
// src/lib/logger.ts

export interface LogContext {
  correlationId?: string;
  orderId?: string;
  customerId?: string;
  service?: string;
  operation?: string;
}

export function createLogger(defaultContext: LogContext = {}) {
  const log = (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...defaultContext,
      ...(data ? { data } : {}),
    };

    // Remove sensitive fields
    if (entry.data) {
      delete entry.data.password;
      delete entry.data.secret;
      delete entry.data.token;
    }

    console[level](JSON.stringify(entry));
  };

  return {
    info: (msg: string, data?: any) => log('info', msg, data),
    warn: (msg: string, data?: any) => log('warn', msg, data),
    error: (msg: string, data?: any) => log('error', msg, data),
    debug: (msg: string, data?: any) => log('debug', msg, data),
  };
}
```

### 8.2 Correlation ID Middleware

```typescript
// src/middleware.ts (enhance existing)

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function middleware(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || uuidv4();

  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);

  // Add to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-correlation-id', correlationId);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
```

### 8.3 Health Check Endpoint

```typescript
// src/app/api/health/route.ts

import { prisma } from '@/lib/prisma/client';

export async function GET() {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: Date.now() - dbStart };
  } catch {
    checks.database = { status: 'unhealthy', latency: Date.now() - dbStart };
  }

  // App check
  checks.app = { status: 'healthy' };

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

  return Response.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    version: process.env.APP_VERSION ?? 'dev',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }, { status: allHealthy ? 200 : 503 });
}
```

### 8.4 Error Handling Middleware

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }

  // Unknown error — log full details, return sanitised
  console.error('Unhandled error:', error);
  return Response.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 }
  );
}
```

### 8.5 Phase 5 Files

| Action | File | Changes |
|--------|------|---------|
| **[NEW]** | `src/lib/logger.ts` | Structured logger |
| **[MODIFY]** | `src/middleware.ts` | Correlation ID injection |
| **[NEW]** | `src/app/api/health/route.ts` | Health check endpoint |
| **[NEW]** | `src/lib/errors.ts` | Error classes + handler |
| **[MODIFY]** | All API routes | Use `handleApiError()` wrapper |
| **[MODIFY]** | All services | Use structured logger |

---

## 9. Phase 6 — Real E2E Integration

> **Priority**: 🟡 HIGH  
> **Goal**: Wire everything to real Supabase + real auth + real DB + real checkout + real admin workflow  
> **Estimated Effort**: 5-7 working days

### 9.1 Supabase Auth Integration

```typescript
// src/lib/supabase/auth.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}

export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError('Not authenticated');

  // Check admin role in user metadata or admin_users table
  const isAdmin = user.app_metadata?.role === 'admin' ||
    user.user_metadata?.is_admin === true;

  if (!isAdmin) throw new UnauthorizedError('Not an admin');
  return user;
}
```

### 9.2 Database Migration Strategy

```text
Development:  prisma db push (fast iteration)
Staging:      prisma migrate dev (create migration files)
Production:   prisma migrate deploy (apply migration files only)
```

**Migration commands:**
```bash
# Create migration after schema change
npx prisma migrate dev --name descriptive_name

# Apply in production
npx prisma migrate deploy

# Verify schema
npx prisma validate
```

### 9.3 Real E2E Test Suite

```typescript
// tests/e2e/full-workflow.spec.ts (Playwright)

test.describe('Complete E2E Workflow', () => {
  test('customer can browse, add to cart, and checkout', async ({ page }) => {
    await page.goto('/shop');
    // Browse products
    // Add to cart
    // Go to checkout
    // Fill details
    // Submit order
    // Verify order created
  });

  test('admin can process order through complete lifecycle', async ({ page }) => {
    await page.goto('/admin');
    // Login as admin
    // View pending orders
    // Confirm order
    // Mark as paid (test mode)
    // Send to production
    // Complete production
    // Pass QC
    // Pack
    // Create shipment
    // Confirm delivery
    // Verify final state
  });

  test('admin can manage inventory', async ({ page }) => {
    await page.goto('/admin/inventory');
    // View stock levels
    // Adjust stock
    // Verify ledger entry
  });
});
```

### 9.4 Environment Configuration

```bash
# .env.local (development)
DATABASE_URL="postgresql://user:pass@localhost:5432/stixnvibes_dev"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-key"
RAZORPAY_KEY_ID="rzp_test_xxx"
RAZORPAY_KEY_SECRET="your-test-secret"
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"
NEXT_PUBLIC_WHATSAPP_NUMBER="919876543210"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud"
CRON_SECRET="your-cron-secret"
APP_VERSION="1.0.0-dev"
```

---

## 10. Phase 7 — Commercial Launch Hardening

> **Priority**: 🟢 MEDIUM  
> **Goal**: Backups, migration tooling, environment separation, monitoring, recovery, security audit  
> **Estimated Effort**: 3-4 working days

### 10.1 Backup Strategy

```bash
# scripts/backup.sh

#!/bin/bash
BACKUP_DIR="${HOME}/stixnvibes/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/stixnvibes_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Dump and compress
pg_dump -U postgres stixnvibes | gzip > "${BACKUP_FILE}"

# Keep only last 30 backups
ls -t "${BACKUP_DIR}"/stixnvibes_*.sql.gz | tail -n +31 | xargs rm -f 2>/dev/null

echo "Backup created: ${BACKUP_FILE}"
echo "Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
```

### 10.2 Environment Validation

```typescript
// src/lib/env.ts

const REQUIRED_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const PRODUCTION_FORBIDDEN = [
  { var: 'DATABASE_URL', pattern: /localhost/, message: 'Cannot use localhost DB in production' },
  { var: 'RAZORPAY_KEY_ID', pattern: /rzp_test_/, message: 'Cannot use test Razorpay in production' },
] as const;

export function validateEnvironment() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    for (const check of PRODUCTION_FORBIDDEN) {
      const value = process.env[check.var];
      if (value && check.pattern.test(value)) {
        throw new Error(`PRODUCTION SAFETY: ${check.message}`);
      }
    }
  }
}
```

### 10.3 Security Checklist

```text
✅ All prices calculated server-side (already done)
☐ Admin routes protected by auth middleware
☐ CSRF protection on mutation endpoints
☐ Rate limiting on checkout and payment endpoints
☐ Input validation with zod on all API routes
☐ SQL injection prevention (Prisma parameterised queries)
☐ XSS prevention (React auto-escaping + sanitise user content)
☐ Secrets never in client bundles (verify with build output check)
☐ Webhook signature verification (Razorpay)
☐ RLS policies on Supabase tables
☐ CORS configuration for API routes
☐ Secure session cookies (httpOnly, secure, sameSite)
```

### 10.4 Production Readiness Checklist

```text
☐ All Prisma migrations applied cleanly
☐ Seed data removed from production
☐ Environment variables configured
☐ Razorpay in LIVE mode (not test)
☐ Cloudinary configured
☐ WhatsApp Business number verified
☐ SSL/HTTPS configured
☐ Backup job running (cron or Supabase)
☐ Health check endpoint responsive
☐ Error monitoring active (Sentry or similar)
☐ DNS configured
☐ Lighthouse score ≥ 95
☐ All unit tests passing
☐ All E2E tests passing
☐ Load test with 50 concurrent users
☐ Manual walkthrough of complete order lifecycle
```

---

## 11. Samsung Galaxy S20 FE (Termux) Deployment

> [!IMPORTANT]
> This section covers running the **entire stack** (Node.js + PostgreSQL + Next.js) on the phone under Termux. This is for development/demo purposes. Production should target Netlify + Supabase.

### 11.1 Prerequisites

```bash
# Install Termux from F-Droid (NOT Play Store)
# Install Termux:API, Termux:Boot, Termux:Widget

# In Termux:
pkg update && pkg upgrade -y
pkg install -y nodejs-lts postgresql git python make
npm install -g npm@latest
```

### 11.2 Directory Structure on Phone

```text
~/stixnvibes/
├── app/                         # Cloned repo
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── ...
├── postgres-data/               # PostgreSQL data directory
├── backups/                     # Automated DB backups
├── logs/
│   ├── app.log                  # Next.js logs
│   ├── postgres.log             # PostgreSQL logs
│   └── cron.log                 # Cron job logs
├── scripts/
│   ├── start.sh                 # Start everything
│   ├── stop.sh                  # Stop everything
│   ├── backup.sh                # Manual backup
│   ├── health-check.sh          # Health verification
│   ├── cron-reservations.sh     # Expire stale reservations
│   └── setup.sh                 # First-time setup
├── .env                         # Environment config
└── README-TERMUX.md             # Instructions
```

### 11.3 Setup Script

```bash
#!/bin/bash
# ~/stixnvibes/scripts/setup.sh

set -e
echo "=== Stix N Vibes — Termux Setup ==="

BASE_DIR="$HOME/stixnvibes"
APP_DIR="$BASE_DIR/app"
PG_DATA="$BASE_DIR/postgres-data"

# 1. Initialize PostgreSQL
echo "[1/6] Initializing PostgreSQL..."
mkdir -p "$PG_DATA"
initdb -D "$PG_DATA"

# Start PostgreSQL
pg_ctl -D "$PG_DATA" -l "$BASE_DIR/logs/postgres.log" start

# Create database
createdb stixnvibes
echo "Database 'stixnvibes' created."

# 2. Clone or update repo
if [ ! -d "$APP_DIR" ]; then
  echo "[2/6] Cloning repository..."
  git clone https://github.com/YOUR_REPO/stixnvibes-nv.git "$APP_DIR"
else
  echo "[2/6] Updating repository..."
  cd "$APP_DIR" && git pull
fi

# 3. Install dependencies
echo "[3/6] Installing dependencies..."
cd "$APP_DIR"
npm ci

# 4. Setup environment
echo "[4/6] Setting up environment..."
if [ ! -f "$BASE_DIR/.env" ]; then
  cat > "$BASE_DIR/.env" << 'EOF'
DATABASE_URL="postgresql://$(whoami)@localhost:5432/stixnvibes"
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
NEXT_PUBLIC_WHATSAPP_NUMBER="919876543210"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
CRON_SECRET="$(openssl rand -hex 32)"
NODE_ENV="development"
PORT=3000
EOF
  echo "Created .env — please edit with your values"
fi

# Symlink .env
ln -sf "$BASE_DIR/.env" "$APP_DIR/.env.local"

# 5. Run migrations
echo "[5/6] Running database migrations..."
cd "$APP_DIR"
npx prisma migrate deploy
npx prisma generate

# 6. Build
echo "[6/6] Building application..."
npm run build

echo ""
echo "=== Setup Complete ==="
echo "Start with: ~/stixnvibes/scripts/start.sh"
echo "Stop with:  ~/stixnvibes/scripts/stop.sh"
```

### 11.4 Start Script

```bash
#!/bin/bash
# ~/stixnvibes/scripts/start.sh

BASE_DIR="$HOME/stixnvibes"
APP_DIR="$BASE_DIR/app"
PG_DATA="$BASE_DIR/postgres-data"
LOG_DIR="$BASE_DIR/logs"

mkdir -p "$LOG_DIR"

echo "=== Starting Stix N Vibes ==="

# 1. Start PostgreSQL (if not running)
if ! pg_isready -q 2>/dev/null; then
  echo "[1/3] Starting PostgreSQL..."
  pg_ctl -D "$PG_DATA" -l "$LOG_DIR/postgres.log" start
  sleep 2
  echo "PostgreSQL started."
else
  echo "[1/3] PostgreSQL already running."
fi

# 2. Start Next.js
echo "[2/3] Starting Next.js..."
cd "$APP_DIR"
export $(cat "$BASE_DIR/.env" | grep -v '^#' | xargs)
nohup npx next start -p ${PORT:-3000} > "$LOG_DIR/app.log" 2>&1 &
echo $! > "$BASE_DIR/app.pid"
echo "Next.js started on port ${PORT:-3000} (PID: $(cat $BASE_DIR/app.pid))"

# 3. Start cron jobs (reservation expiry every 5 minutes)
echo "[3/3] Starting reservation expiry cron..."
(
  while true; do
    sleep 300  # 5 minutes
    curl -s -X POST "http://localhost:${PORT:-3000}/api/cron/expire-reservations" \
      -H "Authorization: Bearer $(grep CRON_SECRET $BASE_DIR/.env | cut -d'=' -f2 | tr -d '"')" \
      >> "$LOG_DIR/cron.log" 2>&1
  done
) &
echo $! > "$BASE_DIR/cron.pid"

echo ""
echo "=== All services started ==="
echo "App:       http://localhost:${PORT:-3000}"
echo "Admin:     http://localhost:${PORT:-3000}/admin"
echo "Health:    http://localhost:${PORT:-3000}/api/health"
echo "Logs:      $LOG_DIR/"
echo ""
echo "To access from other devices on same WiFi:"
echo "  Find IP: ip addr show wlan0 | grep inet"
echo "  Access:  http://<PHONE_IP>:${PORT:-3000}"
```

### 11.5 Stop Script

```bash
#!/bin/bash
# ~/stixnvibes/scripts/stop.sh

BASE_DIR="$HOME/stixnvibes"

echo "=== Stopping Stix N Vibes ==="

# Stop cron
if [ -f "$BASE_DIR/cron.pid" ]; then
  kill $(cat "$BASE_DIR/cron.pid") 2>/dev/null
  rm "$BASE_DIR/cron.pid"
  echo "Cron stopped."
fi

# Stop Next.js
if [ -f "$BASE_DIR/app.pid" ]; then
  kill $(cat "$BASE_DIR/app.pid") 2>/dev/null
  rm "$BASE_DIR/app.pid"
  echo "Next.js stopped."
fi

# Stop PostgreSQL
pg_ctl -D "$BASE_DIR/postgres-data" stop 2>/dev/null
echo "PostgreSQL stopped."

echo "=== All services stopped ==="
```

### 11.6 Health Check Script

```bash
#!/bin/bash
# ~/stixnvibes/scripts/health-check.sh

PORT=${PORT:-3000}

echo "=== Health Check ==="

# PostgreSQL
if pg_isready -q 2>/dev/null; then
  echo "✅ PostgreSQL: running"
else
  echo "❌ PostgreSQL: NOT running"
fi

# Next.js
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/health" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Next.js:    running (port $PORT)"
  curl -s "http://localhost:$PORT/api/health" | python -m json.tool 2>/dev/null || true
else
  echo "❌ Next.js:    NOT responding (HTTP $HTTP_CODE)"
fi

# Disk usage
echo ""
echo "Disk Usage:"
du -sh "$HOME/stixnvibes/postgres-data" 2>/dev/null | awk '{print "  Database:  " $1}'
du -sh "$HOME/stixnvibes/backups" 2>/dev/null | awk '{print "  Backups:   " $1}'
du -sh "$HOME/stixnvibes/app/.next" 2>/dev/null | awk '{print "  Build:     " $1}'

# Memory
echo ""
echo "Memory: $(free -h 2>/dev/null | awk '/^Mem:/ {print $3 "/" $2 " used"}' || echo 'N/A')"
```

### 11.7 Backup Script (Termux)

```bash
#!/bin/bash
# ~/stixnvibes/scripts/backup.sh

BACKUP_DIR="$HOME/stixnvibes/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/stixnvibes_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Creating backup..."
pg_dump stixnvibes | gzip > "${BACKUP_FILE}"

# Keep only last 14 backups (phone storage is limited)
ls -t "${BACKUP_DIR}"/stixnvibes_*.sql.gz | tail -n +15 | xargs rm -f 2>/dev/null

echo "✅ Backup: ${BACKUP_FILE}"
echo "   Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
echo "   Total backups: $(ls ${BACKUP_DIR}/*.sql.gz 2>/dev/null | wc -l)"
```

### 11.8 Termux:Boot Auto-Start

```bash
# ~/.termux/boot/start-stixnvibes.sh

#!/data/data/com.termux/files/usr/bin/bash
sleep 10  # Wait for system to fully boot
$HOME/stixnvibes/scripts/start.sh >> $HOME/stixnvibes/logs/boot.log 2>&1
```

### 11.9 Samsung Galaxy S20 FE Specific Considerations

```text
┌──────────────────────────────────────────────────────────────────┐
│  SAMSUNG GALAXY S20 FE — Performance Considerations             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RAM Management:                                                 │
│  • Next.js production server: ~150-250MB RAM                     │
│  • PostgreSQL: ~50-100MB RAM                                     │
│  • Total: ~300-350MB (out of 6-8GB available)                   │
│  • ✅ Comfortable headroom                                       │
│                                                                  │
│  Battery Management:                                             │
│  • Disable Android battery optimisation for Termux               │
│  • Settings > Apps > Termux > Battery > Unrestricted             │
│  • Use Termux:Boot for auto-restart                              │
│  • Keep phone plugged in if running as server                    │
│                                                                  │
│  Storage:                                                        │
│  • node_modules: ~200-400MB                                      │
│  • .next build: ~100-200MB                                       │
│  • PostgreSQL data: ~50-200MB (depends on catalog size)          │
│  • Total: ~500MB-1GB (out of 128GB available)                    │
│  • ✅ Plenty of space                                            │
│                                                                  │
│  Network:                                                        │
│  • Access via phone's IP on WiFi                                 │
│  • Use ngrok/cloudflared for external access                     │
│  • Consider Tailscale for remote admin                           │
│                                                                  │
│  Limitations:                                                    │
│  • No system cron — use Termux cron or loop scripts              │
│  • Android may kill background processes                         │
│  • Not suitable for high-traffic production                      │
│  • Best for: dev, demo, small-scale operation                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. Docker Deployment

### 12.1 Updated Dockerfile

```dockerfile
# Dockerfile

# --- Base ---
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# --- Builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

### 12.2 Updated docker-compose.yml

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: stixnvibes
      POSTGRES_USER: stixnvibes
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stixnvibes"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://stixnvibes:${POSTGRES_PASSWORD:-dev_password}@postgres:5432/stixnvibes"
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      RAZORPAY_KEY_ID: ${RAZORPAY_KEY_ID}
      RAZORPAY_KEY_SECRET: ${RAZORPAY_KEY_SECRET}
      RAZORPAY_WEBHOOK_SECRET: ${RAZORPAY_WEBHOOK_SECRET}
      NEXT_PUBLIC_WHATSAPP_NUMBER: ${NEXT_PUBLIC_WHATSAPP_NUMBER}
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: ${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
      CRON_SECRET: ${CRON_SECRET:-dev_cron_secret}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Migration runner (run once)
  migrate:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    command: npx prisma migrate deploy
    environment:
      DATABASE_URL: "postgresql://stixnvibes:${POSTGRES_PASSWORD:-dev_password}@postgres:5432/stixnvibes"
    depends_on:
      postgres:
        condition: service_healthy

  # Development server with hot reload
  dev:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    command: npm run dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      DATABASE_URL: "postgresql://stixnvibes:${POSTGRES_PASSWORD:-dev_password}@postgres:5432/stixnvibes"
    depends_on:
      postgres:
        condition: service_healthy

  # Test runner
  tests:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    command: sh -c "npm run lint && npm run typecheck && npm run test:run"
    environment:
      DATABASE_URL: "postgresql://stixnvibes:${POSTGRES_PASSWORD:-dev_password}@postgres:5432/stixnvibes"
      NODE_ENV: test
    depends_on:
      postgres:
        condition: service_healthy

  # Backup job (run manually or via cron)
  backup:
    image: postgres:15-alpine
    command: >
      sh -c "pg_dump -h postgres -U stixnvibes stixnvibes | 
      gzip > /backups/stixnvibes_$$(date +%Y%m%d_%H%M%S).sql.gz"
    environment:
      PGPASSWORD: ${POSTGRES_PASSWORD:-dev_password}
    volumes:
      - ./backups:/backups
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

### 12.3 Docker Commands

```bash
# Development
docker compose up dev

# Production
docker compose run --rm migrate   # Run migrations first
docker compose up app -d          # Start production app

# Tests
docker compose run --rm tests

# Backup
docker compose run --rm backup

# Full teardown
docker compose down -v
```

---

## 13. Testing Strategy

### 13.1 Test Pyramid

```text
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲           5-10 tests (Playwright)
                 ╱________╲         Real browser, real API
                ╱          ╲
               ╱ Integration ╲      15-25 tests (Vitest + real DB)
              ╱________________╲    Services against database
             ╱                  ╲
            ╱    Unit Tests      ╲  40-60 tests (Vitest)
           ╱______________________╲ Pure functions, state machine, pricing
```

### 13.2 Test Categories & Files

#### Unit Tests (Pure logic, no DB)

| File | Tests |
|------|-------|
| `tests/unit/state-machine.test.ts` | All state transitions, terminal states, cancellation rules |
| `tests/unit/pricing.test.ts` | Price calculation with all modifier combos |
| `tests/unit/validators.test.ts` | Input validation (checkout payload, order transition requests) |
| `tests/unit/utils.test.ts` | `cn()`, `formatPrice()`, `slugify()` |
| `tests/unit/errors.test.ts` | Error class hierarchy |
| `tests/unit/env-validation.test.ts` | Environment variable validation |

#### Integration Tests (Services + real DB)

| File | Tests |
|------|-------|
| `tests/integration/inventory.test.ts` | Atomic reservation, release, expiry |
| `tests/integration/checkout.test.ts` | Full checkout transaction with price snapshots |
| `tests/integration/concurrency.test.ts` | Two purchases for last unit (the KEY test) |
| `tests/integration/order-lifecycle.test.ts` | Complete state machine with DB |
| `tests/integration/payment.test.ts` | Payment creation, webhook processing, idempotency |
| `tests/integration/production.test.ts` | Production job creation and completion |
| `tests/integration/qc.test.ts` | QC pass, fail, rework |

#### E2E Tests (Playwright, browser)

| File | Tests |
|------|-------|
| `tests/e2e/storefront.spec.ts` | Browse, search, add to cart, checkout |
| `tests/e2e/admin-workflow.spec.ts` | Complete order processing lifecycle |
| `tests/e2e/inventory.spec.ts` | Stock management from admin |
| `tests/e2e/responsive.spec.ts` | Mobile and desktop layouts |

### 13.3 The 8 Critical Business Tests

> [!IMPORTANT]
> These tests prove the system is commercially viable. All must pass before launch.

```text
1. Can two people buy the last sticker?
   → tests/integration/concurrency.test.ts
   → Exactly one succeeds, one fails

2. Can a customer manipulate the price?
   → tests/integration/checkout.test.ts
   → Server always uses DB price, ignores client price

3. Can an invalid order status be forced?
   → tests/unit/state-machine.test.ts
   → PENDING → SHIPPED rejected

4. Does an old order retain its original price?
   → tests/integration/checkout.test.ts
   → OrderItem snapshots survive product price changes

5. Can a failed payment create a fulfilled order?
   → tests/integration/payment.test.ts
   → payment.failed → order stays CONFIRMED (not PAID)

6. Can a webhook be replayed safely?
   → tests/integration/payment.test.ts
   → Duplicate webhook returns 200, no double processing

7. Can cancelled inventory be restored correctly?
   → tests/integration/inventory.test.ts
   → Cancellation releases stock + creates ledger entry

8. Can an order travel from checkout to delivery?
   → tests/integration/order-lifecycle.test.ts
   → PENDING → CONFIRMED → PAID → PRODUCTION → PRINTING → QC → PACKING → SHIPPED → DELIVERED
```

### 13.4 Test Configuration

```typescript
// vitest.config.ts (updated)

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/**/*.test.tsx',
    ],
    exclude: ['tests/e2e/**'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

```typescript
// tests/setup.ts

import { beforeAll, afterAll, beforeEach } from 'vitest';

// For integration tests: connect to test database
beforeAll(async () => {
  // Set test database URL
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 
    'postgresql://test:test@localhost:5432/stixnvibes_test';
});

// Clean up test data between tests
beforeEach(async () => {
  // Truncate tables (integration tests only)
  if (process.env.TEST_TYPE === 'integration') {
    const { prisma } = await import('@/lib/prisma/client');
    await prisma.$executeRaw`TRUNCATE "Order", "OrderItem", "InventoryReservation", "InventoryLedger", "Payment", "PaymentWebhookEvent" CASCADE`;
  }
});
```

### 13.5 Running Tests

```bash
# Unit tests only (fast, no DB needed)
npm run test:run -- --reporter=verbose tests/unit/

# Integration tests (needs test DB running)
TEST_TYPE=integration npm run test:run -- tests/integration/

# All tests
npm run test:run

# Watch mode (development)
npm test

# E2E (needs build + running app)
npm run build
npm run test:e2e

# Coverage report
npx vitest run --coverage

# Lint + typecheck (always run before declaring done)
npm run lint && npm run typecheck
```

---

## 14. File-by-File Change Manifest

### Phase 1 — Transactional Correctness

| Action | File | Description |
|--------|------|-------------|
| **[MODIFY]** | `prisma/schema.prisma` | Add `OrderStatus` enum extensions, `ReservationStatus`, `LedgerEntryType` enums; update `InventoryReservation` with `expiresAt`, `status`; update `InventoryLedger` with proper fields; add price snapshot fields to `OrderItem`; add `PaymentWebhookEvent` model |
| **[NEW]** | `src/lib/state-machine/order-state-machine.ts` | Canonical typed state machine with `OrderStatus` enum, `canTransition`, `getNextStates`, `isTerminal`, `isCancellable`, `requiresInventoryRelease` |
| **[NEW]** | `src/lib/services/inventory.service.ts` | `reserveStock()`, `releaseReservation()`, `expireStaleReservations()`, `commitReservation()`, `adjustStock()` |
| **[MODIFY]** | `src/lib/checkout/` (existing) | Wire atomic `reserveStock()` + price snapshot population into checkout transaction |
| **[NEW]** | `src/app/api/cron/expire-reservations/route.ts` | Cron endpoint for reservation expiry |
| **[NEW]** | `tests/unit/state-machine.test.ts` | All state transition tests |
| **[NEW]** | `tests/integration/inventory.test.ts` | Atomic reservation, release, expiry tests |
| **[NEW]** | `tests/integration/concurrency.test.ts` | Two-buyer-last-unit test |
| **[NEW]** | `tests/integration/checkout.test.ts` | Price snapshot + transaction tests |
| **[MODIFY]** | `supabase/schema.sql` | Mirror all Prisma schema changes |

### Phase 2 — Payment Correctness

| Action | File | Description |
|--------|------|-------------|
| **[MODIFY]** | `src/lib/payment/razorpay.ts` → `src/lib/integrations/razorpay.ts` | Idempotent order creation |
| **[MODIFY]** | `src/app/api/payments/webhook/route.ts` | Idempotent webhook handler with event dedup |
| **[MODIFY]** | `prisma/schema.prisma` | Add `PaymentWebhookEvent` model, update `Payment` model |
| **[NEW]** | `tests/integration/payment.test.ts` | Webhook idempotency, amount mismatch, duplicate protection |
| **[NEW]** | `tests/unit/payment-validation.test.ts` | Signature verification, amount validation |

### Phase 3 — Complete Operational Workflow

| Action | File | Description |
|--------|------|-------------|
| **[NEW]** | `src/lib/services/order.service.ts` | `transitionOrder()` with side effects |
| **[NEW]** | `src/lib/services/production.service.ts` | Production job management |
| **[NEW]** | `src/lib/services/qc.service.ts` | QC pass/fail/rework |
| **[NEW]** | `src/lib/services/shipping.service.ts` | Shipment creation, delivery confirmation |
| **[NEW]** | `src/app/api/orders/[id]/transition/route.ts` | Order transition API |
| **[NEW]** | `tests/integration/order-lifecycle.test.ts` | Full lifecycle test |
| **[NEW]** | `tests/integration/production.test.ts` | Production workflow tests |
| **[NEW]** | `tests/integration/qc.test.ts` | QC workflow tests |

### Phase 4 — Admin Operational UX

| Action | File | Description |
|--------|------|-------------|
| **[MODIFY]** | `src/app/admin/page.tsx` | Real-time dashboard with actionable metrics |
| **[NEW]** | `src/app/api/admin/dashboard/route.ts` | Dashboard data endpoint |
| **[NEW]** | `src/lib/services/analytics.service.ts` | Dashboard query functions |
| **[MODIFY]** | `src/app/admin/orders/` | Order timeline, valid-next-actions buttons |
| **[MODIFY]** | `src/app/admin/production/` | Batch operations, completion flow |
| **[MODIFY]** | `src/app/admin/qc/` | Pass/fail with reason, image upload |
| **[MODIFY]** | `src/app/admin/packing/` | Checklist, invoice generation |
| **[MODIFY]** | `src/app/admin/shipping/` | AWB entry, courier selection |
| **[MODIFY]** | `src/app/admin/inventory/` | Adjustment form, ledger view, low-stock alerts |

### Phase 5 — Observability

| Action | File | Description |
|--------|------|-------------|
| **[NEW]** | `src/lib/logger.ts` | Structured JSON logger |
| **[MODIFY]** | `src/middleware.ts` | Correlation ID injection |
| **[NEW]** | `src/app/api/health/route.ts` | Health check endpoint |
| **[NEW]** | `src/lib/errors.ts` | Error classes + API error handler |
| **[MODIFY]** | All API routes | Wrap with `handleApiError()` |

### Phase 6 — Real E2E Integration

| Action | File | Description |
|--------|------|-------------|
| **[MODIFY]** | `src/lib/supabase/` | Wire real auth |
| **[NEW]** | `src/lib/supabase/auth.ts` | `getCurrentUser()`, `requireAdmin()` |
| **[NEW]** | `tests/e2e/storefront.spec.ts` | Browser-based storefront tests |
| **[NEW]** | `tests/e2e/admin-workflow.spec.ts` | Browser-based admin workflow tests |
| **[NEW]** | `prisma/migrations/` | Generated migration files |

### Phase 7 — Commercial Launch Hardening

| Action | File | Description |
|--------|------|-------------|
| **[NEW]** | `src/lib/env.ts` | Environment validation with production safety checks |
| **[NEW]** | `scripts/backup.sh` | Automated backup script |
| **[MODIFY]** | `Dockerfile` | Production-optimised with health check |
| **[MODIFY]** | `docker-compose.yml` | Full service stack |
| **[NEW]** | `DEPLOYMENT.md` | Deployment guide |

### Termux Deployment

| Action | File | Description |
|--------|------|-------------|
| **[NEW]** | `deploy/termux/setup.sh` | First-time setup |
| **[NEW]** | `deploy/termux/start.sh` | Start all services |
| **[NEW]** | `deploy/termux/stop.sh` | Stop all services |
| **[NEW]** | `deploy/termux/backup.sh` | Manual backup |
| **[NEW]** | `deploy/termux/health-check.sh` | Health verification |
| **[NEW]** | `deploy/termux/README-TERMUX.md` | Phone deployment guide |

---

## 15. Verification & Acceptance Criteria

### 15.1 Phase Gate Criteria

Each phase must pass these gates before moving to the next:

| Phase | Gate Criteria |
|-------|---------------|
| **Phase 1** | ✅ `npm run lint` clean · ✅ `npm run typecheck` clean · ✅ All state machine unit tests pass · ✅ Concurrency test passes (two-buyer-last-unit) · ✅ Price snapshot test passes · ✅ Reservation expiry test passes |
| **Phase 2** | ✅ Phase 1 gates + ✅ Webhook idempotency test passes · ✅ Failed payment doesn't create fulfilled order · ✅ Amount mismatch rejected |
| **Phase 3** | ✅ Phase 2 gates + ✅ Full lifecycle test passes (PENDING → DELIVERED) · ✅ QC fail → rework test passes · ✅ Cancellation + inventory release test passes |
| **Phase 4** | ✅ Phase 3 gates + ✅ Dashboard loads with real data · ✅ Every admin action works without SQL |
| **Phase 5** | ✅ Phase 4 gates + ✅ Health endpoint returns 200 · ✅ Structured logs in JSON format · ✅ No stack traces in API responses |
| **Phase 6** | ✅ Phase 5 gates + ✅ Real auth works · ✅ E2E tests pass against real DB · ✅ Complete checkout-to-delivery in browser |
| **Phase 7** | ✅ Phase 6 gates + ✅ Backup/restore verified · ✅ Migrations apply cleanly · ✅ Production env validation passes · ✅ Lighthouse ≥ 95 |

### 15.2 Commands to Verify Each Phase

```bash
# After EVERY phase:
npm run lint           # ESLint clean
npm run typecheck      # TypeScript strict clean
npm run test:run       # All tests pass

# Phase 1 specific:
npm run test:run -- tests/unit/state-machine.test.ts
npm run test:run -- tests/integration/concurrency.test.ts
npm run test:run -- tests/integration/inventory.test.ts
npm run test:run -- tests/integration/checkout.test.ts

# Phase 2 specific:
npm run test:run -- tests/integration/payment.test.ts

# Phase 3 specific:
npm run test:run -- tests/integration/order-lifecycle.test.ts

# Phase 6 (E2E — requires build):
npm run build
npm run test:e2e

# Phase 7 (Production build verification):
npm run build
NODE_ENV=production node .next/standalone/server.js  # Should start without errors
curl http://localhost:3000/api/health                 # Should return 200
```

### 15.3 Manual Verification Checklist

```text
☐ Browse shop, add items to cart, proceed to checkout
☐ Complete checkout with WhatsApp flow
☐ Admin: view new order in dashboard
☐ Admin: confirm order
☐ Admin: process payment (test Razorpay)
☐ Admin: send to production
☐ Admin: complete production
☐ Admin: pass QC
☐ Admin: pack order
☐ Admin: create shipment with AWB
☐ Admin: confirm delivery
☐ Verify order shows DELIVERED in customer account
☐ Admin: test QC failure → rework → repass
☐ Admin: test cancellation at each stage
☐ Try to buy last item simultaneously (two browser tabs)
☐ Verify old orders retain original prices after catalog change
☐ Verify Termux setup script works on Galaxy S20 FE
☐ Verify health check endpoint
☐ Verify backup and restore
```

---

## Summary

```text
┌──────────────────────────────────────────────────────────────────┐
│  IMPLEMENTATION SUMMARY                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: Transactional Correctness    │ 5-7 days  │ CRITICAL   │
│  Phase 2: Payment Correctness          │ 3-4 days  │ CRITICAL   │
│  Phase 3: Operational Workflow         │ 5-6 days  │ HIGH       │
│  Phase 4: Admin UX                     │ 4-5 days  │ HIGH       │
│  Phase 5: Observability                │ 2-3 days  │ MEDIUM     │
│  Phase 6: Real E2E                     │ 5-7 days  │ HIGH       │
│  Phase 7: Launch Hardening             │ 3-4 days  │ MEDIUM     │
│                                                                  │
│  TOTAL ESTIMATED: 27-36 working days                             │
│                                                                  │
│  New files: ~35                                                  │
│  Modified files: ~25                                             │
│  New tests: ~60-80 test cases                                    │
│  New services: 7 (inventory, order, production, QC,              │
│                    shipping, analytics, environment)              │
│                                                                  │
│  Deployment Targets:                                             │
│    1. Samsung Galaxy S20 FE (Termux) — dev/demo                  │
│    2. Netlify + Supabase — production                            │
│    3. Docker — alternative/staging                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

> [!TIP]
> **Implementation order matters.** Each phase builds on the previous. Do not skip ahead. The state machine and inventory concurrency (Phase 1) are the foundation everything else depends on.

> [!NOTE]
> This plan does **not** propose rebuilding the application. The existing codebase is a strong foundation. Every phase extends and hardens what already exists, following the architecture document's principles while incorporating the senior feedback's priority ordering.
