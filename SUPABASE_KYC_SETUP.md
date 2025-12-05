# Supabase KYC Documents Bucket Setup

## Issue
The `kyc-documents` bucket needs Row Level Security (RLS) policies configured to allow file uploads.

## Solution

### Step 1: Create the Bucket (if it doesn't exist)
1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name: `kyc-documents`
5. Make it **Private** (recommended for security)
6. Click **Create bucket**

### Step 2: Configure RLS Policies

1. Click on the `kyc-documents` bucket
2. Go to the **Policies** tab
3. Click **New Policy**

#### Policy 1: Allow INSERT (Upload)
- **Policy name**: `Allow anon uploads` or `Allow authenticated uploads`
- **Allowed operation**: `INSERT`
- **Target roles**: `anon` (or `authenticated` if using JWT)
- **Policy definition** (USING expression):
  ```sql
  (bucket_id = 'kyc-documents')
  ```
- **WITH CHECK expression**:
  ```sql
  (bucket_id = 'kyc-documents')
  ```

#### Policy 2: Allow SELECT (Read) - Optional
If you want users to view their own documents:
- **Policy name**: `Allow users to view own documents`
- **Allowed operation**: `SELECT`
- **Target roles**: `anon` or `authenticated`
- **Policy definition** (USING expression):
  ```sql
  (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  ```

### Step 3: Alternative - Make Bucket Public (Less Secure)
If you want to make the bucket public (not recommended for sensitive documents):
1. Go to bucket settings
2. Toggle **Public bucket** to ON
3. This bypasses RLS but is less secure

### Step 4: Verify
After setting up policies, try uploading a KYC document again. The upload should work.

## SQL Commands (Alternative Method)

You can also run these SQL commands in the Supabase SQL Editor:

```sql
-- Create policy for INSERT (upload)
CREATE POLICY "Allow anon uploads to kyc-documents"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'kyc-documents');

-- Create policy for SELECT (read) - optional
CREATE POLICY "Allow users to view own kyc documents"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'kyc-documents');
```

## Notes
- The bucket name is case-sensitive: `kyc-documents` (not `KYC-Documents`)
- Files are organized by user ID: `{userId}/{documentType}-{timestamp}-{randomId}.{ext}`
- Maximum file size: 5MB
- Allowed file types: JPEG, PNG

