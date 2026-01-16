# LATIDOS | Business Operating System

> **Antigravity Architecture** • **Liquid Glass Design** • **Holistic Control**

LATIDOS is a comprehensive, modular Enterprise Resource Planning (ERP) and Point of Sale (POS) system designed for high-performance retail and logistics operations. Built on a philosophy of "Antigravity"—removing friction and weight from operational workflows—it integrates finance, inventory, logistics, and CRM into a seamless, unified experience.

---

## 🚀 Core Philosophy

- **Antigravity**: Interfaces designed to be lighter, faster, and more intuitive than standard enterprise software.
- **Liquid Glass**: A visual design language capable of holding complex data densities while remaining readable and aesthetically premium.
- **Immediate Consistency**: "Semaphores" and visual indicators provide instant feedback on system health (financial, logistical, and operational).

---

## 📦 Key Modules

### 1. Executive Control Center & Dashboards
The command deck for decision-makers.
- **V3 Modular Dashboard**: Dynamic widget engine with drag-and-drop capability.
- **Metrics**: Real-time tracking of sales, courier rankings, and financial liquidity.
- **Data Visualization**: Charts and KPIs visualizing the pulse of the business.

### 2. Finance & Treasury
A rigorous double-entry compatible financial engine.
- **Tier 1 Liquidity**: Clear separation of immediate assets (Cash/Bank) from systemic assets.
- **Real Utility**: Real-time margin calculation `(Sale Price - Historical Cost)`.
- **Abono Inteligente**: Cascading payment engine for partial deposits and debt management.

### 3. Sales & Point of Sale (POS)
Streamlined checkout for high-volume environments.
- **Fast Sale**: Integrated barcode scanning and quick-search.
- **Unified Cart**: Seamless handling of products and services.
- **Invoice Management**: Deep search, status tracking, and PDF generation.

### 4. Logistics & Delivery
Visual Kanban-based delivery management.
- **Kanban Flow**: Drag-and-drop lifecycle (Preparation -> Route -> Delivered).
- **Routing**: Sector-based optimization for delivery drivers.
- **Evidence**: Mandatory photo evidence for delivery completion.

### 5. Inventory & Products
Intelligent stock management.
- **Recepción Inteligente**: Streamlined inbound stock workflows.
- **Product Catalog**: Rich taxonomy with cost tracking and pricing intelligence.
- **Quick Create**: Rapid product entry for dynamic inventory needs.

### 6. Directory (CRM)
Professional relationship management.
- **Customers & Providers**: Unified profiles with transaction history.
- **Financial Health**: Visual semaphore indicators for credit standing.

### 7. Security & Team
Multi-layered access control.
- **Role-Based Access**: Granular permissions (ADMIN, VENTAS, LOGISTICA).
- **Empoderados System**: PIN-based secondary auth for critical actions.
- **Audit Trails**: Complete traceability of sensitive operations.

---

## 🛠 Technology Stack

**Core Framework**
- **Next.js 14** (App Router)
- **React** (Server Components & Hooks)
- **TypeScript** (Strict Mode)

**Data Layer**
- **Prisma ORM**
- **SQLite / PostgreSQL** (Environment dependent)

**Styling & UI**
- **Tailwind CSS**
- **Framer Motion** (Animations)
- **Lucide React** (Icons)

**Authentication**
- **NextAuth.js v5**

---

## ⚡ Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-org/latidos-app.git
    cd latidos-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory (refer to `.env.example`).
    ```env
    DATABASE_URL="file:./dev.db"
    NEXTAUTH_SECRET="your-secret-key"
    NEXTAUTH_URL="http://localhost:3000"
    ```

4.  **Database Setup**
    ```bash
    npx prisma generate
    npx prisma db push
    # Seed initial data (optional)
    npm run seed
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```

    Access the app at `http://localhost:3000`.

---

## 📂 Project Structure

```
src/
├── app/                 # Next.js App Router pages & layouts
│   ├── (dashboard)/     # Protected dashboard routes
│   ├── api/             # API Routes
│   ├── finance/         # Finance module
│   ├── inventory/       # Inventory module
│   ├── logistics/       # Logistics module
│   ├── sales/           # POS & Sales module
│   └── ...
├── components/          # Reusable UI components
├── lib/                 # Utilities, Prisma client, Auth config
└── ...
```

---

## 🤝 Contribution Guidelines

- **Code Quality**: Strict linting is enforced. No `any` types.
- **Commits**: Use descriptive messages.
- **Design**: Adhere to the "Antigravity" design tokens (spacing, glassmorphism, typography).

---

© 2026 LATIDOS System. All rights reserved.
