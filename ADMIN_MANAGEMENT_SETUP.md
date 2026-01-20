# Admin Management Tab Setup Guide

## Issue: Admin Management Tab Not Showing

If the "Admin Management" tab is not appearing in the sidebar, follow these steps:

### Step 1: Update Your Existing Admin Account Role

Your existingg admin account needs to have `role = 'super_admin'` in the database.











**Option A: Via SQL (Recommended)**
```sql
-- Connect to your database and run:
UPDATE blocks_admins 
SET role = 'super_admin' 
WHERE email = 'your-admin-email@example.com';

-- Verify it worked:
SELECT id, email, full_name, role, is_active 
FROM blocks_admins 
WHERE email = 'your-admin-email@example.com';
```

**Option B: Via Backend API (if you have another super_admin)**
```bash
# This requires you to be logged in as super_admin
curl -X PATCH http://localhost:3000/blocks-admin/{admin-id} \
  -H "Content-Type: application/json" \
  -H "x-admin-id: {your-super-admin-id}" \
  -d '{"role": "super_admin"}'
```

### Step 2: Logout and Login Again

After updating the role in the database:
1. **Logout** from the admin panel
2. **Clear browser cache/localStorage** (or use incognito mode)
3. **Login again** with your admin credentials

The role should now be loaded from the backend.

### Step 3: Verify Role is Loaded

Open browser console (F12) and check:
1. Look for log: `🔍 AdminSidebar - Current admin user:`
2. Check if `role: 'super_admin'` is shown
3. If role is `undefined` or `null`, the backend isn't returning it

### Step 4: Check Backend Response

In browser DevTools → Network tab:
1. Find the `/blocks-admin/login` request
2. Check the response - it should include `role` field:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "fullName": "...",
    "role": "super_admin",  // ← This should be here
    "isActive": true
  }
}
```

### Step 5: If Role is Still Missing

If the backend response doesn't include `role`, check:

1. **Database has role column:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'blocks_admins' AND column_name = 'role';
```

2. **Backend entity includes role:**
   - Check `Blocks-Backend/src/blocks-admin/entities/blocks-admin.entity.ts`
   - Should have `@Column({ type: 'varchar', length: 50, default: AdminRole.ADMIN }) role: AdminRole;`

3. **TypeORM sync:**
   - Restart backend server
   - Check console for: `[TypeORM] Synchronizing database schema...`
   - The `role` column should be created automatically

### Step 6: Temporary Workaround (For Testing)

If you want to test the Admin Management page without fixing roles:

1. Open browser console
2. Run:
```javascript
localStorage.setItem('adminUser', JSON.stringify({
  ...JSON.parse(localStorage.getItem('adminUser')),
  role: 'super_admin'
}));
```
3. Refresh the page

**Note:** This is temporary - you still need to fix the database role.

---

## Quick Fix Script

Run this SQL to update ALL existing admins to super_admin:

```sql
-- Update all existing admins to super_admin
UPDATE blocks_admins 
SET role = 'super_admin' 
WHERE role IS NULL OR role = '' OR role = 'admin';

-- Verify
SELECT email, role, is_active FROM blocks_admins;
```

Then logout and login again.

---

## Expected Behavior

Once fixed:
- ✅ "Admin Management" tab appears in sidebar (under Management section)
- ✅ Only visible to users with `role = 'super_admin'`
- ✅ Clicking it shows the Admin Management page
- ✅ Can create MLRO, Audit Manager, Compliance Officer accounts

---

## Troubleshooting

**Tab still not showing?**
1. Check browser console for errors
2. Verify `adminUser.role === 'super_admin'` in console
3. Check if `hasPermission('super_admin', 'admins', 'view')` returns `true`
4. Verify the sidebar component is rendering (check React DevTools)

**Permission denied?**
- Make sure your role is exactly `'super_admin'` (case-sensitive)
- Check `ROLE_PERMISSIONS` in `src/utils/rbac.js`

**Backend errors?**
- Check backend logs for TypeORM sync errors
- Verify database connection
- Check if `blocks_admins` table exists
