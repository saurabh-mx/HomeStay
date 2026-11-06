# 🏠 HomeStay

An vacation rental marketplace connecting **Hosts** (property owners) with **Guests** (travelers).

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 + Tailwind CSS |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | JWT + NextAuth.js |
| **Payments** | Stripe (International) + Razorpay (India) |
| **File Storage** | Cloudinary / AWS S3 |
| **Maps** | Google Maps API / Mapbox |
| **Real-time** | Socket.io |
| **Mobile** | React Native |
| **Deployment** | Vercel (Web) + Railway/AWS (Backend) |

## Project Structure

```
HomeStay/
├── apps/
│   ├── web/               # Next.js web application
│   └── mobile/            # React Native mobile app
├── server/
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API route definitions
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── utils/         # Helper functions
│   │   └── validators/    # Request validation schemas
│   └── prisma/            # Database schema & migrations
├── packages/
│   ├── shared/            # Shared types, constants, utilities
│   └── config/            # Shared config (ESLint, TypeScript, etc.)
└── docs/                  # Documentation
```

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15
- pnpm >= 8

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp server/.env.example server/.env

# Run database migrations
cd server && npx prisma migrate dev

# Start development servers
pnpm dev
```

## License

MIT

An Airbnb-style vacation rental marketplace connecting **Hosts** (property owners) with **Guests** (travelers).

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 + Tailwind CSS |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | JWT + NextAuth.js |
| **Payments** | Stripe (International) + Razorpay (India) |
| **File Storage** | Cloudinary / AWS S3 |
| **Maps** | Google Maps API / Mapbox |
| **Real-time** | Socket.io |
| **Mobile** | React Native |
| **Deployment** | Vercel (Web) + Railway/AWS (Backend) |

## Project Structure

```
HomeStay/
├── apps/
│   ├── web/               # Next.js web application
│   └── mobile/            # React Native mobile app
├── server/
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API route definitions
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── utils/         # Helper functions
│   │   └── validators/    # Request validation schemas
│   └── prisma/            # Database schema & migrations
├── packages/
│   ├── shared/            # Shared types, constants, utilities
│   └── config/            # Shared config (ESLint, TypeScript, etc.)
└── docs/                  # Documentation
```

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15
- pnpm >= 8

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp server/.env.example server/.env

# Run database migrations
cd server && npx prisma migrate dev

# Start development servers
pnpm dev
```

## License

MIT
