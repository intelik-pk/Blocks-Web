# HMR Dashboard - System Architecture Diagram

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HMR DASHBOARD SYSTEM                        │
│                    (Real Estate Tokenization Platform)              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Browser    │  │   Mobile     │  │    Tablet    │             │
│  │   Desktop    │  │   Browser    │  │   Browser    │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                      │
│         └──────────────────┴──────────────────┘                      │
│                            │                                         │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      REACT APPLICATION                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    ROUTING LAYER                            │    │
│  │              (React Router v6)                              │    │
│  │                                                             │    │
│  │  /              → Home                                      │    │
│  │  /admin         → Admin Dashboard (Protected)              │    │
│  │  /orgdashboard  → Organization Dashboard (Protected)       │    │
│  │  /properties    → Properties Listing                       │    │
│  │  /wallet        → Wallet Management                        │    │
│  │  /portfolio     → User Portfolio                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                 GLOBAL STATE MANAGEMENT                     │    │
│  │                                                             │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │ AuthContext  │  │ UserContext  │  │ ThemeContext │   │    │
│  │  │              │  │              │  │              │   │    │
│  │  │ - user       │  │ - currentUser│  │ - theme      │   │    │
│  │  │ - token      │  │ - users      │  │ - toggleTheme│   │    │
│  │  │ - login()    │  │ - switchUser │  │              │   │    │
│  │  │ - logout()   │  │              │  │              │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                      VIEW LAYER                             │    │
│  │                                                             │    │
│  │  ┌───────────────────────────────────────────────────┐    │    │
│  │  │          ADMIN DASHBOARD                          │    │    │
│  │  │  ┌─────────────────────────────────────────┐     │    │    │
│  │  │  │ AdminSidebar                            │     │    │    │
│  │  │  │  - Overview                             │     │    │    │
│  │  │  │  - Properties Management                │     │    │    │
│  │  │  │  - Users Management                     │     │    │    │
│  │  │  │  - Investments Management               │     │    │    │
│  │  │  │  - Transactions Management              │     │    │    │
│  │  │  │  - Organizations Management             │     │    │    │
│  │  │  │  - KYC Management                       │     │    │    │
│  │  │  │  - Notifications Management             │     │    │    │
│  │  │  │  - Settings                             │     │    │    │
│  │  │  └─────────────────────────────────────────┘     │    │    │
│  │  │                                                   │    │    │
│  │  │  ┌─────────────────────────────────────────┐     │    │    │
│  │  │  │ Metric Cards                            │     │    │    │
│  │  │  │  - Total Investment (large blue card)   │     │    │    │
│  │  │  │  - Total Properties                     │     │    │    │
│  │  │  │  - Total Users                          │     │    │    │
│  │  │  │  - Total Organizations                  │     │    │    │
│  │  │  │  - Total Transactions                   │     │    │    │
│  │  │  └─────────────────────────────────────────┘     │    │    │
│  │  │                                                   │    │    │
│  │  │  ┌─────────────────────────────────────────┐     │    │    │
│  │  │  │ Charts & Visualizations                 │     │    │    │
│  │  │  │  - Tokens Sold Chart (flippable)        │     │    │    │
│  │  │  │  - Investment Statistics (donut)        │     │    │    │
│  │  │  │  - KYC Status Display                   │     │    │    │
│  │  │  └─────────────────────────────────────────┘     │    │    │
│  │  └───────────────────────────────────────────────────┘    │    │
│  │                                                             │    │
│  │  ┌───────────────────────────────────────────────────┐    │    │
│  │  │          ORGANIZATION DASHBOARD                   │    │    │
│  │  │  (Filtered by organizationId)                     │    │    │
│  │  │                                                    │    │    │
│  │  │  - Organization Overview                          │    │    │
│  │  │  - Organization Properties                        │    │    │
│  │  │  - Organization Users (Investors)                 │    │    │
│  │  │  - Organization Investments                       │    │    │
│  │  │  - Organization Transactions                      │    │    │
│  │  │  - Organization Profile                           │    │    │
│  │  └───────────────────────────────────────────────────┘    │    │
│  │                                                             │    │
│  │  ┌───────────────────────────────────────────────────┐    │    │
│  │  │          USER PAGES                               │    │    │
│  │  │                                                    │    │    │
│  │  │  - Home (Landing page)                            │    │    │
│  │  │  - Properties Listing                             │    │    │
│  │  │  - Property Detail                                │    │    │
│  │  │  - Portfolio                                      │    │    │
│  │  │  - Wallet                                         │    │    │
│  │  │  - Profile                                        │    │    │
│  │  │  - Notifications                                  │    │    │
│  │  └───────────────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    UI COMPONENT LIBRARY                     │    │
│  │                                                             │    │
│  │  Button  Input  Card  Badge  Select  FileUpload           │    │
│  │  Toast  Modal  Table  Spinner  Dropdown                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API SERVICE LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    AXIOS HTTP CLIENT                        │    │
│  │                                                             │    │
│  │  • Request Interceptor (JWT injection)                     │    │
│  │  • Response Interceptor (Error handling)                   │    │
│  │  • Retry Logic                                             │    │
│  │  • Timeout Configuration                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                     API MODULES                             │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────┐     │    │
│  │  │ adminAPI                                         │     │    │
│  │  │  - getDashboard()                                │     │    │
│  │  │  - getUsers()                                    │     │    │
│  │  │  - getProperties()                               │     │    │
│  │  │  - getInvestments()                              │     │    │
│  │  │  - getTransactions()                             │     │    │
│  │  │  - getOrganizations()                            │     │    │
│  │  └──────────────────────────────────────────────────┘     │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────┐     │    │
│  │  │ orgAdminAPI                                      │     │    │
│  │  │  - orgAdminLogin()                               │     │    │
│  │  │  - createOrganization()                          │     │    │
│  │  │  - updateOrganization()                          │     │    │
│  │  │  - deleteOrganization()                          │     │    │
│  │  │  - resetOrgPassword()                            │     │    │
│  │  │  - changeOrgAdminPassword()                      │     │    │
│  │  └──────────────────────────────────────────────────┘     │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────┐     │    │
│  │  │ organizationsAPI                                 │     │    │
│  │  │  - getAll()                                      │     │    │
│  │  │  - getById()                                     │     │    │
│  │  │  - getDashboard()                                │     │    │
│  │  │  - getProperties()                               │     │    │
│  │  │  - getUsers()                                    │     │    │
│  │  │  - getInvestments()                              │     │    │
│  │  │  - getTransactions()                             │     │    │
│  │  │  - getLiquidity()                                │     │    │
│  │  └──────────────────────────────────────────────────┘     │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────┐     │    │
│  │  │ propertiesAPI                                    │     │    │
│  │  │  - getAll()                                      │     │    │
│  │  │  - getById()                                     │     │    │
│  │  │  - create()                                      │     │    │
│  │  │  - update()                                      │     │    │
│  │  │  - uploadImages()                                │     │    │
│  │  └──────────────────────────────────────────────────┘     │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────┐     │    │
│  │  │ investmentsAPI                                   │     │    │
│  │  │  - getAll()                                      │     │    │
│  │  │  - invest()                                      │     │    │
│  │  │  - getUserAnalytics()                            │     │    │
│  │  │  - getOrganizationAnalytics()                    │     │    │
│  │  └──────────────────────────────────────────────────┘     │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────┐     │    │
│  │  │ walletAPI                                        │     │    │
│  │  │  - getWallet()                                   │     │    │
│  │  │  - deposit()                                     │     │    │
│  │  │  - buyTokens()                                   │     │    │
│  │  └──────────────────────────────────────────────────┘     │    │
│  │                                                             │    │
│  │  └─── usersAPI, kycAPI, notificationsAPI, etc.            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                   REACT QUERY CACHE                         │    │
│  │                                                             │    │
│  │  • Cache Management                                        │    │
│  │  • Background Refetching (30s interval)                   │    │
│  │  • Optimistic Updates                                     │    │
│  │  • Retry Logic                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND API                                    │
│              (https://blocks-backend.vercel.app)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                  API ENDPOINTS                            │      │
│  │                                                           │      │
│  │  Admin Routes:                                           │      │
│  │    GET    /admin/dashboard                               │      │
│  │    GET    /admin/users                                   │      │
│  │    POST   /admin/users                                   │      │
│  │    GET    /admin/investments                             │      │
│  │    GET    /admin/transactions                            │      │
│  │    GET    /admin/organizations                           │      │
│  │    POST   /admin/organizations                           │      │
│  │    PATCH  /admin/organizations/:id                       │      │
│  │    DELETE /admin/organizations/:id                       │      │
│  │    POST   /admin/notifications/send                      │      │
│  │                                                           │      │
│  │  Organization Routes:                                    │      │
│  │    GET    /organizations                                 │      │
│  │    GET    /organizations/:id                             │      │
│  │    GET    /organizations/:id/transactions                │      │
│  │    GET    /organizations/:id/liquidity                   │      │
│  │                                                           │      │
│  │  Organization Admin Routes:                              │      │
│  │    POST   /org/auth/login                                │      │
│  │    PATCH  /org/auth/change-password/:id                  │      │
│  │                                                           │      │
│  │  Properties Routes:                                      │      │
│  │    GET    /properties                                    │      │
│  │    GET    /properties?org=ORG-000001                     │      │
│  │    GET    /properties/:id                                │      │
│  │    POST   /properties                                    │      │
│  │    PATCH  /properties/:id                                │      │
│  │                                                           │      │
│  │  Investments Routes:                                     │      │
│  │    GET    /investments                                   │      │
│  │    POST   /investments/invest                            │      │
│  │    GET    /investments/analytics/organization/:id        │      │
│  │    GET    /investments/analytics/user/:id                │      │
│  │                                                           │      │
│  │  Wallet Routes:                                          │      │
│  │    GET    /wallet/user/:id                               │      │
│  │    POST   /wallet/deposit                                │      │
│  │    GET    /api/mobile/wallet                             │      │
│  │                                                           │      │
│  │  Transactions Routes:                                    │      │
│  │    GET    /transactions                                  │      │
│  │    GET    /transactions/user/:id                         │      │
│  │                                                           │      │
│  │  Notifications Routes:                                   │      │
│  │    GET    /api/notifications/user/:id                    │      │
│  │    POST   /api/notifications/register-web-push/:id       │      │
│  │    PATCH  /api/notifications/mark-read/:id/user/:userId  │      │
│  │                                                           │      │
│  │  KYC Routes:                                             │      │
│  │    GET    /kyc/user/:id                                  │      │
│  │    POST   /kyc/submit                                    │      │
│  │    PATCH  /kyc/:id                                       │      │
│  │                                                           │      │
│  │  Upload Routes:                                          │      │
│  │    POST   /upload/image/:category                        │      │
│  │    POST   /upload/document/:category                     │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                  SUPABASE (PostgreSQL)                    │      │
│  │                                                           │      │
│  │  Tables:                                                 │      │
│  │    • users                                               │      │
│  │    • organizations                                       │      │
│  │    • organization_admins                                 │      │
│  │    • properties                                          │      │
│  │    • investments                                         │      │
│  │    • transactions                                        │      │
│  │    • wallets                                             │      │
│  │    • kyc_verifications                                   │      │
│  │    • notifications                                       │      │
│  │    • web_push_subscriptions                              │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### 1. User Investment Flow

```
┌──────────┐
│  User    │
│ Browses  │
│Properties│
└────┬─────┘
     │
     │ 1. View Properties
     ▼
┌──────────────────┐
│  Properties      │◄──────────┐
│  Listing Page    │           │
└────┬─────────────┘           │
     │                         │
     │ 2. Select Property      │
     ▼                         │
┌──────────────────┐           │
│  Property        │           │
│  Detail Page     │           │
└────┬─────────────┘           │
     │                         │
     │ 3. Click "Invest"       │
     ▼                         │
┌──────────────────┐           │
│  Wallet Page     │           │
│  (Buy Tokens)    │           │
└────┬─────────────┘           │
     │                         │
     │ 4. Enter Amount         │
     │                         │
     ▼                         │
┌──────────────────┐           │
│  Investment API  │           │
│  POST /invest    │           │
└────┬─────────────┘           │
     │                         │
     │ 5. Process Payment      │
     ▼                         │
┌──────────────────┐           │
│  Update Wallet   │           │
│  & Portfolio     │           │
└────┬─────────────┘           │
     │                         │
     │ 6. Success              │
     ▼                         │
┌──────────────────┐           │
│  Confirmation    │───────────┘
│  & Redirect      │
└──────────────────┘
```

### 2. Admin Organization Management Flow

```
┌──────────┐
│  Admin   │
│  Logs In │
└────┬─────┘
     │
     │ 1. Admin Login
     ▼
┌──────────────────┐
│  Admin           │
│  Dashboard       │
└────┬─────────────┘
     │
     │ 2. Navigate to Organizations
     ▼
┌──────────────────┐
│  Organizations   │
│  Management      │
└────┬─────────────┘
     │
     │ 3. Click "Create Organization"
     ▼
┌──────────────────┐
│  Create Org      │
│  Modal           │
└────┬─────────────┘
     │
     │ 4. Fill Details
     │    - Name
     │    - Email
     │    - Password (auto-generated)
     ▼
┌──────────────────┐
│  POST /admin/    │
│  organizations   │
└────┬─────────────┘
     │
     │ 5. Backend Creates
     │    - Organization
     │    - Admin User
     ▼
┌──────────────────┐
│  Show            │
│  Credentials     │
│  Modal           │
└────┬─────────────┘
     │
     │ 6. Admin Views/Copies
     │    - Organization ID
     │    - Admin Email
     │    - Admin Password
     ▼
┌──────────────────┐
│  Organization    │
│  Created         │
└──────────────────┘
```

### 3. Organization Admin Data Filtering Flow

```
┌──────────────────┐
│  Org Admin       │
│  Logs In         │
│  admin@hmr.com   │
└────┬─────────────┘
     │
     │ 1. POST /org/auth/login
     ▼
┌──────────────────────────────┐
│  Backend Validates           │
│  Returns:                    │
│    - organizationId          │
│    - organizationName        │
│    - adminDetails            │
└────┬─────────────────────────┘
     │
     │ 2. Store in localStorage
     ▼
┌──────────────────────────────┐
│  Organization Dashboard      │
│  Loads                       │
└────┬─────────────────────────┘
     │
     ├────────────────────────────────┐
     │                                │
     │ 3. Fetch Data (ALL Filtered)   │
     │                                │
     ▼                                ▼
┌──────────────────┐      ┌──────────────────┐
│ GET /properties  │      │ GET /admin/users │
│ ?org=ORG-000001  │      │ ?org=ORG-000001  │
└────┬─────────────┘      └────┬─────────────┘
     │                          │
     │ Only HMR properties      │ Only HMR users
     │                          │
     ▼                          ▼
┌──────────────────────────────────────┐
│  Display Filtered Data               │
│                                      │
│  • Properties: 15 (HMR only)        │
│  • Users: 42 (HMR only)             │
│  • Investments: $500K (HMR only)    │
│  • Transactions: 120 (HMR only)     │
└──────────────────────────────────────┘
```

### 4. Theme Toggle Flow

```
┌──────────┐
│  User    │
│  Clicks  │
│  Theme   │
│  Toggle  │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│  ThemeContext    │
│  toggleTheme()   │
└────┬─────────────┘
     │
     ├─────────────────────┐
     │                     │
     │ Current: dark       │ Current: light
     │ Switch to: light    │ Switch to: dark
     │                     │
     ▼                     ▼
┌──────────────┐    ┌──────────────┐
│ Remove 'dark'│    │ Remove       │
│ Add 'light'  │    │ 'light'      │
│ to <html>    │    │ Add 'dark'   │
│              │    │ to <html>    │
└──────┬───────┘    └──────┬───────┘
       │                   │
       └───────┬───────────┘
               │
               ▼
       ┌───────────────┐
       │ Save to       │
       │ localStorage  │
       │ 'theme'       │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │ CSS Variables │
       │ Update        │
       │ Automatically │
       └───────────────┘
```

### 5. Web Push Notification Flow

```
┌──────────┐
│  User    │
│  Visits  │
│  Site    │
└────┬─────┘
     │
     │ 1. Service Worker Registers
     ▼
┌──────────────────┐
│  SW Registration │
│  /sw.js          │
└────┬─────────────┘
     │
     │ 2. Request Permission
     ▼
┌──────────────────┐
│  Browser Prompt  │
│  "Allow          │
│   Notifications?"│
└────┬─────────────┘
     │
     │ 3. User Grants Permission
     ▼
┌──────────────────┐
│  Subscribe to    │
│  Push Service    │
└────┬─────────────┘
     │
     │ 4. Get Subscription
     ▼
┌──────────────────────────────┐
│  Subscription Object         │
│  {                           │
│    endpoint: "...",          │
│    keys: {...}               │
│  }                           │
└────┬─────────────────────────┘
     │
     │ 5. POST /api/notifications/register-web-push/:userId
     ▼
┌──────────────────────────────┐
│  Backend Stores              │
│  Subscription                │
└────┬─────────────────────────┘
     │
     │ 6. Admin Sends Notification
     ▼
┌──────────────────────────────┐
│  POST /admin/notifications/  │
│  send                        │
└────┬─────────────────────────┘
     │
     │ 7. Backend Sends Push
     ▼
┌──────────────────────────────┐
│  Push Service                │
│  (FCM/VAPID)                 │
└────┬─────────────────────────┘
     │
     │ 8. Browser Receives
     ▼
┌──────────────────────────────┐
│  Service Worker              │
│  Displays Notification       │
└──────────────────────────────┘
```

---

## 🎯 Component Hierarchy

### Admin Dashboard Component Tree

```
AdminDashboard
├── AdminSidebar
│   ├── Logo
│   ├── Navigation Items
│   │   ├── Overview
│   │   ├── Properties
│   │   ├── Users
│   │   ├── Investments
│   │   ├── Transactions
│   │   ├── Organizations
│   │   ├── KYC
│   │   ├── Notifications
│   │   ├── Reports
│   │   ├── Tokens
│   │   └── Settings
│   └── User Profile
│
├── Header
│   ├── Admin Icon
│   ├── Title
│   ├── Welcome Message
│   ├── ThemeToggle
│   ├── SafeAdminNotificationIcon
│   └── Logout Button
│
└── Main Content (Based on activeTab)
    │
    ├── Overview
    │   ├── Metric Cards Row
    │   │   ├── Total Investment (Large Blue Card)
    │   │   ├── Total Properties
    │   │   ├── Total Users
    │   │   ├── Total Organizations
    │   │   └── Total Transactions
    │   │
    │   └── Charts Row
    │       ├── Tokens Sold Chart (Flippable)
    │       ├── Investment Statistics (Donut)
    │       └── KYC Status Display
    │
    ├── Properties Management
    │   ├── Search & Filters
    │   ├── Property Table
    │   └── Action Buttons
    │
    ├── Users Management
    │   ├── User Table
    │   └── User Actions
    │
    ├── Investments Management
    │   ├── Investment Table
    │   └── Filters
    │
    ├── Transactions Management
    │   ├── Transaction Table
    │   └── Filters
    │
    ├── Organizations Management
    │   ├── Organization Cards
    │   ├── Create Organization Modal
    │   ├── Edit Organization Modal
    │   ├── Credentials Modal
    │   └── Reset Password Modal
    │
    ├── KYC Management
    │   ├── KYC Table
    │   └── Approve/Reject Actions
    │
    ├── Notifications Management
    │   ├── Notification Form
    │   └── Send Button
    │
    └── Settings
        └── Platform Configuration
```

### Organization Dashboard Component Tree

```
OrgDashboard
├── Header
│   ├── Logo
│   ├── Organization Name
│   ├── Organization Badge (ORG-000001)
│   ├── Admin Email
│   ├── ThemeToggle
│   ├── SafeOrgAdminNotificationIcon
│   └── Logout Button
│
├── Tab Navigation
│   ├── Overview
│   ├── Properties
│   ├── Users
│   ├── Transactions
│   ├── Investments
│   └── Profile
│
└── Tab Content
    │
    ├── Overview
    │   ├── Stat Cards
    │   │   ├── Total Users
    │   │   ├── Total Properties
    │   │   ├── Total Investments
    │   │   └── Total Transactions
    │   │
    │   ├── Secondary Stats
    │   │   ├── Investment Count
    │   │   ├── Transaction Amount
    │   │   └── Property Value
    │   │
    │   ├── Quick Actions
    │   │   ├── View Properties Button
    │   │   ├── View Users Button
    │   │   ├── View Investments Button
    │   │   └── View Transactions Button
    │   │
    │   └── API Status Display
    │       ├── Dashboard API Status
    │       └── Individual Endpoint Status
    │
    ├── OrgPropertiesManagement
    │   └── (Filtered by organizationId)
    │
    ├── OrgUsersManagement
    │   └── (Filtered by organizationId)
    │
    ├── OrgTransactionsManagement
    │   └── (Filtered by organizationId)
    │
    ├── OrgInvestmentsManagement
    │   └── (Filtered by organizationId)
    │
    └── OrgProfile
        ├── Organization Details
        └── Change Password Form
```

---

## 🔐 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  AUTHENTICATION FLOWS                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    ADMIN AUTHENTICATION                       │
└──────────────────────────────────────────────────────────────┘

1. Admin Login
   ┌─────────┐
   │ Admin   │
   │ Enters  │
   │ Creds   │
   └────┬────┘
        │
        ▼
   ┌────────────┐
   │ Validate   │ ◄─── Hardcoded for demo
   │ Creds      │      admin@hmrbuilders.com
   └────┬───────┘
        │
        │ Valid
        ▼
   ┌────────────────────┐
   │ AdminAuthContext   │
   │ login()            │
   │  - Set adminUser   │
   │  - Store session   │
   │  - Set expiry      │
   │    (1 hour)        │
   └────┬───────────────┘
        │
        ▼
   ┌────────────────────┐
   │ localStorage       │
   │  - adminSession    │
   │  - adminUser       │
   │  - adminSessionExpiry
   └────┬───────────────┘
        │
        ▼
   ┌────────────────────┐
   │ Redirect to        │
   │ /admin             │
   └────────────────────┘

2. Session Management
   ┌────────────────────┐
   │ Every 5 minutes    │
   │ Check expiry       │
   └────┬───────────────┘
        │
        ├──── Expired? ────┐
        │                  │
        │ No               │ Yes
        ▼                  ▼
   ┌──────────┐      ┌──────────┐
   │ Extend   │      │ Logout   │
   │ Session  │      │ Redirect │
   └──────────┘      └──────────┘

3. Activity Extension
   ┌────────────────────┐
   │ User Activity      │
   │  - Click           │
   │  - Keypress        │
   │  - Scroll          │
   └────┬───────────────┘
        │
        ▼
   ┌────────────────────┐
   │ Reset expiry to    │
   │ 1 hour from now    │
   └────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              ORGANIZATION ADMIN AUTHENTICATION                │
└──────────────────────────────────────────────────────────────┘

1. Org Admin Login
   ┌─────────┐
   │ Org     │
   │ Admin   │
   │ Enters  │
   │ Creds   │
   └────┬────┘
        │
        ▼
   ┌────────────────────┐
   │ POST /org/auth/    │
   │ login              │
   │  - email           │
   │  - password        │
   └────┬───────────────┘
        │
        │ Valid
        ▼
   ┌────────────────────────┐
   │ Backend Returns        │
   │  - organizationId      │
   │  - organizationName    │
   │  - organizationSlug    │
   │  - adminEmail          │
   │  - adminId             │
   └────┬───────────────────┘
        │
        ▼
   ┌────────────────────────┐
   │ OrganizationAuthContext│
   │ login()                │
   │  - Set orgUser         │
   │  - Store session       │
   └────┬───────────────────┘
        │
        ▼
   ┌────────────────────────┐
   │ localStorage           │
   │  - orgSession          │
   │  - orgUser             │
   │  - organizationId      │
   └────┬───────────────────┘
        │
        ▼
   ┌────────────────────────┐
   │ Redirect to            │
   │ /orgdashboard          │
   └────────────────────────┘

2. Data Filtering
   ┌────────────────────────┐
   │ All API calls include  │
   │ organizationId filter  │
   └────┬───────────────────┘
        │
        ▼
   ┌────────────────────────┐
   │ GET /properties        │
   │ ?org=ORG-000001        │
   └────┬───────────────────┘
        │
        ▼
   ┌────────────────────────┐
   │ Only HMR data returned │
   └────────────────────────┘
```

---

## 📦 State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT LAYERS                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    GLOBAL STATE                              │
│                  (React Context)                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │ AuthContext                                      │      │
│  │                                                   │      │
│  │  State:                                          │      │
│  │    - user: User | null                           │      │
│  │    - token: string | null                        │      │
│  │    - refreshToken: string | null                 │      │
│  │    - isAuthenticated: boolean                    │      │
│  │    - loading: boolean                            │      │
│  │                                                   │      │
│  │  Actions:                                        │      │
│  │    - login(credentials)                          │      │
│  │    - register(userData)                          │      │
│  │    - googleAuth(googleData)                      │      │
│  │    - logout()                                    │      │
│  │    - updateUser(userData)                        │      │
│  │                                                   │      │
│  │  Persistence: localStorage                       │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │ UserContext                                      │      │
│  │                                                   │      │
│  │  State:                                          │      │
│  │    - currentUser: User | null                    │      │
│  │    - users: User[]                               │      │
│  │    - usersLoading: boolean                       │      │
│  │    - usersError: Error | null                    │      │
│  │                                                   │      │
│  │  Actions:                                        │      │
│  │    - switchUser(userId)                          │      │
│  │    - refreshUsers()                              │      │
│  │                                                   │      │
│  │  Data Source: GET /admin/users                   │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │ ThemeContext                                     │      │
│  │                                                   │      │
│  │  State:                                          │      │
│  │    - theme: 'dark' | 'light'                     │      │
│  │                                                   │      │
│  │  Actions:                                        │      │
│  │    - toggleTheme()                               │      │
│  │    - setTheme(theme)                             │      │
│  │                                                   │      │
│  │  Persistence: localStorage                       │      │
│  │  Default: System preference or 'dark'            │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   SERVER STATE                               │
│                  (React Query)                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Cache Configuration:                                        │
│    - refetchInterval: 30000ms (30s)                         │
│    - refetchOnWindowFocus: false                            │
│    - retry: 1                                               │
│    - retryDelay: 1000ms                                     │
│                                                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Query Keys & Data                                │      │
│  │                                                   │      │
│  │  admin-dashboard:                                │      │
│  │    GET /admin/dashboard                          │      │
│  │    Refetch: 30s                                  │      │
│  │                                                   │      │
│  │  admin-all-investments:                          │      │
│  │    GET /investments?limit=10000                  │      │
│  │    Refetch: 30s                                  │      │
│  │                                                   │      │
│  │  admin-all-properties:                           │      │
│  │    GET /properties?limit=10000                   │      │
│  │    Refetch: 30s                                  │      │
│  │                                                   │      │
│  │  org-dashboard-data:                             │      │
│  │    GET /admin/dashboard?organizationId=...       │      │
│  │    Refetch: 30s                                  │      │
│  │                                                   │      │
│  │  org-properties-count:                           │      │
│  │    GET /properties?org=ORG-000001                │      │
│  │    Refetch: 30s                                  │      │
│  │                                                   │      │
│  │  featured-properties:                            │      │
│  │    GET /properties/featured                      │      │
│  │    Refetch: 60s                                  │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   LOCAL STATE                                │
│                  (Component State)                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  - UI State (modals, dropdowns, etc.)                       │
│  - Form State (react-hook-form)                             │
│  - Temporary State (search, filters)                        │
│  - Navigation State (active tab, etc.)                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENCE                                │
│                  (localStorage)                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Admin Session:                                              │
│    - adminSession: "true"                                   │
│    - adminUser: JSON                                        │
│    - adminSessionExpiry: timestamp                          │
│                                                               │
│  Organization Session:                                       │
│    - orgSession: "true"                                     │
│    - orgUser: JSON                                          │
│    - organizationId: "ORG-000001"                           │
│                                                               │
│  User Session:                                               │
│    - token: JWT                                             │
│    - refreshToken: JWT                                      │
│                                                               │
│  UI Preferences:                                             │
│    - theme: "dark" | "light"                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

*This architecture diagram provides a visual representation of the HMR Dashboard system's structure, data flow, and component relationships.*

**Created:** December 2, 2025
**System Version:** 1.0.0

