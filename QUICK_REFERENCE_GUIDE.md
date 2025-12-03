# HMR Dashboard - Quick Reference Guide

## 🚀 Quick Start

### Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

The application will open at `http://localhost:3000`

---

## 🔑 Login Credentials

### Super Admin
- **Email:** `admin@hmrbuilders.com`
- **Password:** (configured in system)
- **Access:** Full system access, all organizations

### Organization Admins (Examples)
- **HMR Company:**
  - Email: `admin@hmr.com`
  - Access: Only HMR organization data

- **Saima Company:**
  - Email: `admin@saima.com`
  - Access: Only Saima organization data

---

## 📁 Key Files & Locations

### Configuration
- **API Base URL:** `src/config/api.js`
  - Default: `https://blocks-backend.vercel.app`
  
- **Supabase Config:** `src/config/supabase.js`

- **Tailwind Config:** `tailwind.config.js`

### Main Entry Points
- **App Entry:** `src/index.js`
- **Main App:** `src/App.js`
- **Routes:** Defined in `src/App.js`

### Key Services
- **All APIs:** `src/services/api.js` (550+ lines)
- **Web Push:** `src/services/webPush.js`
- **File Upload:** `src/services/supabaseUpload.js`

### Contexts
- **Auth:** `src/contexts/AuthContext.js`
- **User:** `src/contexts/UserContext.js`
- **Theme:** `src/contexts/ThemeContext.js`

---

## 🎯 Main Routes

### Public Routes
```
/                     → Home page
/properties           → Browse properties
/properties/:id       → Property details
/login                → User login
/register             → User registration
```

### Admin Routes (Protected)
```
/admin/login          → Admin login
/admin                → Admin dashboard
/admin/property/:id   → Admin property detail
/admin/notifications  → Admin notifications
```

### Organization Routes (Protected)
```
/org/login            → Organization admin login
/orgdashboard         → Organization dashboard
/orgdashboard/property/:id → Org property detail
/org/notifications    → Org notifications
```

### User Routes
```
/portfolio            → User portfolio
/wallet               → User wallet
/profile              → User profile
/notifications        → User notifications
```

---

## 🔧 Key Components

### UI Components (`src/components/ui/`)
```javascript
Button    → Reusable button component
Input     → Form input component
Card      → Container card component
Badge     → Status badge component
Select    → Dropdown select
Toast     → Toast notifications
```

### Admin Components (`src/components/admin/`)
```javascript
AdminAuth          → Admin authentication HOC
AdminSidebar       → Sidebar navigation
PropertyForm       → Create/edit properties
UserForm           → User management
MetricCards        → Dashboard metrics
InvestmentChart    → Investment visualization
```

### Layout Components
```javascript
Layout     → Main layout wrapper
Header     → Global header
```

---

## 📊 API Endpoints Quick Reference

### Admin APIs
```javascript
GET    /admin/dashboard        → Dashboard stats
GET    /admin/users            → All users
POST   /admin/users            → Create user
GET    /admin/properties       → All properties
GET    /admin/investments      → All investments
GET    /admin/transactions     → All transactions
GET    /admin/organizations    → All organizations
POST   /admin/organizations    → Create organization
```

### Organization APIs
```javascript
GET    /organizations/:id                      → Get organization
GET    /organizations/:id/transactions         → Org transactions
GET    /properties?org=ORG-000001             → Org properties
GET    /admin/users?org=ORG-000001            → Org users
GET    /investments?org=ORG-000001            → Org investments
```

### Organization Admin APIs
```javascript
POST   /org/auth/login                        → Org admin login
PATCH  /org/auth/change-password/:id          → Change password
POST   /admin/organizations                   → Create org (super admin)
PATCH  /admin/organizations/:id               → Update org
DELETE /admin/organizations/:id               → Delete org
```

### Properties APIs
```javascript
GET    /properties              → List properties
GET    /properties/:id          → Get property
POST   /properties              → Create property
PATCH  /properties/:id          → Update property
```

### Investments APIs
```javascript
GET    /investments                           → List investments
POST   /investments/invest                    → Make investment
GET    /investments/analytics/organization/:id → Org analytics
```

---

## 🎨 Theme System

### Toggle Theme
```javascript
import { useTheme } from './contexts/ThemeContext';

const { theme, toggleTheme } = useTheme();

// Current theme: 'dark' or 'light'
<button onClick={toggleTheme}>
  {theme === 'dark' ? '🌞' : '🌙'}
</button>
```

### Theme Colors
```css
/* Light Mode */
--primary: 0 166 255 (Bright cyan blue)
--background: 255 255 255 (White)
--foreground: 15 23 42 (Dark slate)

/* Dark Mode */
--primary: 0 166 255 (Bright cyan blue)
--background: 1 4 8 (Near black)
--foreground: 233 239 245 (Light gray)
```

---

## 🔒 Authentication Flow

### Admin Authentication
```javascript
import { useAdminAuth } from './components/admin/AdminAuth';

const { adminUser, isAuthenticated, login, logout } = useAdminAuth();

// Check if authenticated
if (!isAuthenticated) {
  navigate('/admin/login');
}

// Login
await login({ email, password });

// Logout
logout();
```

### Organization Admin Authentication
```javascript
import { useOrganizationAuth } from './components/organization/OrganizationAuth';

const { organizationUser, isAuthenticated, login, logout } = useOrganizationAuth();

// Get organization info
const orgId = organizationUser?.organizationId;
const orgName = organizationUser?.organizationName;
```

---

## 📦 Data Fetching with React Query

### Basic Query
```javascript
import { useQuery } from 'react-query';
import { adminAPI } from './services/api';

const { data, isLoading, error } = useQuery(
  'dashboard-data',
  () => adminAPI.getDashboard(),
  {
    refetchInterval: 30000, // 30 seconds
    retry: 1,
    onError: (error) => {
      console.error('Error:', error);
    }
  }
);
```

### Query with Parameters
```javascript
const { data } = useQuery(
  ['org-properties', organizationId],
  () => organizationsAPI.getProperties(organizationId),
  { enabled: !!organizationId }
);
```

---

## 🎯 Common Tasks

### 1. Creating a New Property

**Admin Dashboard → Properties → Create Property**

```javascript
// In PropertiesManagement.js
const handleCreate = async (propertyData) => {
  await propertiesAPI.create({
    title: "Property Name",
    description: "Description",
    location: "City, Country",
    type: "residential",
    status: "active",
    totalValueUSDT: 1000000,
    totalTokens: 10000,
    pricePerTokenUSDT: 100,
    organizationId: "ORG-000001"
  });
};
```

### 2. Creating a New Organization

**Admin Dashboard → Organizations → Create Organization**

```javascript
// In OrganizationsManagement.js
const handleCreateOrg = async (orgData) => {
  const response = await orgAdminAPI.createOrganization({
    name: "Organization Name",
    description: "Description",
    email: "admin@org.com",
    password: "auto-generated" // or manual
  });
  
  // Response includes credentials
  const { organizationId, adminEmail, adminPassword } = response.data;
};
```

### 3. Filtering Organization Data

```javascript
// All API calls automatically filter by organizationId
const organizationId = "ORG-000001";

// Properties
const properties = await organizationsAPI.getProperties(organizationId);

// Users
const users = await organizationsAPI.getUsers(organizationId);

// Investments
const investments = await organizationsAPI.getInvestments(organizationId);

// Transactions
const transactions = await organizationsAPI.getTransactions(organizationId);
```

### 4. Sending Notifications

**Admin Dashboard → Notifications → Send Notification**

```javascript
// In NotificationsManagement.js
const handleSendNotification = async () => {
  await adminAPI.sendNotification({
    title: "Notification Title",
    message: "Notification message",
    userIds: ["user-id-1", "user-id-2"], // or "all"
    type: "info" // info, success, warning, error
  });
};
```

### 5. Approving KYC

**Admin Dashboard → KYC → Approve/Reject**

```javascript
// In KYCManagement.js
const handleApproveKYC = async (kycId) => {
  await adminAPI.updateKYCStatus(kycId, {
    status: "verified" // or "rejected"
  });
};
```

---

## 🔍 Debugging Tips

### 1. Check Browser Console
- API errors are logged with details
- Network tab shows all API calls
- React Query DevTools (if enabled)

### 2. Check localStorage
```javascript
// Admin session
localStorage.getItem('adminSession')
localStorage.getItem('adminUser')
localStorage.getItem('adminSessionExpiry')

// Organization session
localStorage.getItem('orgSession')
localStorage.getItem('orgUser')
localStorage.getItem('organizationId')

// Theme
localStorage.getItem('theme')
```

### 3. Check API Response Format
```javascript
// The system handles multiple response formats
const data = response?.data?.data?.items ||
             response?.data?.items ||
             response?.data ||
             [];
```

### 4. Common Issues

**Issue:** Session expired
**Solution:** Clear localStorage and login again

**Issue:** API 404 errors
**Solution:** Check API base URL in `src/config/api.js`

**Issue:** Organization data not showing
**Solution:** Verify organizationId is correct and API includes org filter

**Issue:** Theme not persisting
**Solution:** Check if localStorage is enabled in browser

---

## 📚 Useful Commands

### Development
```bash
# Start dev server
npm start

# Build production
npm run build

# Run tests
npm test

# Eject from CRA (not recommended)
npm run eject
```

### Git Commands
```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your message"

# Push to remote
git push origin main
```

### Troubleshooting
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear React cache
rm -rf .cache build

# Check Node version (should be 18+)
node --version
```

---

## 🌟 Best Practices

### 1. Component Structure
```javascript
// Good component structure
const MyComponent = () => {
  // 1. Hooks
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // 2. State
  const [isOpen, setIsOpen] = useState(false);
  
  // 3. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 4. Handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 5. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### 2. Error Handling
```javascript
try {
  const response = await api.get('/endpoint');
  return response.data;
} catch (error) {
  console.error('Error:', error);
  toast.error('Operation failed');
  return null;
}
```

### 3. Conditional Rendering
```javascript
{isLoading ? (
  <LoadingSpinner />
) : error ? (
  <ErrorMessage error={error} />
) : data ? (
  <DataDisplay data={data} />
) : (
  <EmptyState />
)}
```

### 4. API Calls
```javascript
// Use React Query for data fetching
const { data, isLoading, error } = useQuery(
  'key',
  fetchFunction,
  { refetchInterval: 30000 }
);

// Use async/await for mutations
const handleSubmit = async (formData) => {
  try {
    await api.post('/endpoint', formData);
    toast.success('Success!');
  } catch (error) {
    toast.error('Failed!');
  }
};
```

---

## 📖 Additional Resources

### Documentation Files
- **SYSTEM_ANALYSIS.md** - Comprehensive system analysis
- **SYSTEM_ARCHITECTURE_DIAGRAM.md** - Visual architecture diagrams
- **README.md** - General project information
- **QUICK_START.md** - Quick start guide
- **DASHBOARD_REDESIGN.md** - Dashboard redesign notes

### External Resources
- React Documentation: https://react.dev
- React Router: https://reactrouter.com
- React Query: https://tanstack.com/query
- Tailwind CSS: https://tailwindcss.com
- Lucide Icons: https://lucide.dev

---

## 🆘 Getting Help

### Check These First
1. Browser console for errors
2. Network tab for API issues
3. localStorage for session data
4. React Query cache state

### Common Solutions
- Clear cache: `rm -rf node_modules && npm install`
- Clear session: Clear localStorage
- Restart server: Kill and run `npm start`
- Check API: Verify backend is running

---

## 📝 Quick Notes

### Important Files to Edit

**For API changes:** `src/services/api.js`

**For routing changes:** `src/App.js`

**For theme colors:** `src/index.css` and `tailwind.config.js`

**For new pages:** Create in `src/pages/` and add route to `App.js`

**For new components:** Create in `src/components/` and export from `index.js`

### Environment Variables
```env
# .env.local
REACT_APP_API_URL=https://blocks-backend.vercel.app
```

### Port Configuration
- **Frontend:** `http://localhost:3000`
- **Backend:** `https://blocks-backend.vercel.app`

---

**Last Updated:** December 2, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready

---

*This quick reference guide provides instant access to the most commonly needed information for working with the HMR Dashboard system.*

