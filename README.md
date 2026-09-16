# Unified Systems Portal

Enterprise central web portal acting as a single entry point for multiple independent business applications (such as Supply PMS, Service PMS, HRMS, and CRM).

## Core Principles
1. **Universal Architecture**: Not hard-coded for any specific company. Configurable branding & dynamic registry.
2. **Zero Modification to PMS Applications**: Existing Supply PMS and Service PMS applications are maintained independently. Their source code, databases, and business logic remain untouched.
3. **Enterprise RBAC**: Role-Based Access Control enforcing granular route guards on the backend and dynamic navigation cards on the frontend.
4. **Security & Auditability**:
   - Passwords hashed using `bcrypt` (10 rounds).
   - Authenticated with JWT tokens.
   - Brute-force rate limiting on login routes.
   - Comprehensive audit logging for all admin actions (user creation, role modification, system registry changes).

---

## Directory Structure
```
unified-systems-portal/
├── config/
│   └── db.js                 # MongoDB connection logic
├── middleware/
│   ├── auth.js               # JWT authentication middleware
│   ├── permissions.js        # Granular RBAC permission checks
│   └── audit.js              # Audit log helper
├── models/
│   ├── AuditLog.js           # Action tracking schema
│   ├── Organization.js       # Dynamic company branding schema
│   ├── Role.js               # RBAC roles schema
│   ├── System.js             # System / Module Registry schema
│   └── User.js               # User accounts schema
├── public/
│   ├── css/
│   │   └── style.css         # Enterprise design system
│   ├── js/
│   │   └── auth.js           # Client-side session and auth helper
│   ├── index.html            # Central login page
│   ├── dashboard.html        # Central launchpad (authorized systems)
│   ├── users.html            # User management
│   ├── roles.html            # Roles & permissions management
│   ├── systems.html          # System / module registry management
│   └── audit.html            # Audit trail viewer
├── routes/
│   ├── auth.js               # Login, me, logout endpoints
│   ├── audit.js              # Audit trail API
│   ├── organization.js       # Branding configuration API
│   ├── roles.js              # Roles CRUD
│   ├── systems.js            # Systems registry & user-filtered systems
│   └── users.js              # User management CRUD
├── scripts/
│   ├── seed.js               # Initial database seeder
│   └── test-auth.js          # Automated verification script
├── .env.example
├── package.json
└── server.js
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and verify your MongoDB URI:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/unified_systems_portal
JWT_SECRET=super_secret_enterprise_jwt_key_change_in_production_12345
```

### 3. Seed Initial Systems and Users
Run the database seed script:
```bash
npm run seed
```

This generates:
- Default Organization configuration
- Core Roles: `Super Admin`, `Admin`, `Operations Manager`, `Supply Specialist`, `Service Engineer`
- System Registry entries: `Supply PMS` and `Service PMS`
- Default Accounts:
  - **Super Admin**: `admin@portal.local` / `Admin@123456`
  - **Restricted User**: `supply.user@portal.local` / `User@123456`

### 4. Run the Portal
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
