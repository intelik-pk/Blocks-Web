import { supabase } from '../config/supabase';

// Test Supabase connection and bucket access
export const testSupabaseConnection = async () => {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test 1: Check if we can list buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Cannot list buckets:', bucketsError);
      return { success: false, error: bucketsError.message };
    }
    
    console.log('✅ Available buckets:', buckets?.map(b => b.name));
    
    // Test 2: Check if property-images bucket exists
    const imagesBucketExists = buckets?.some(b => b.name === 'property-images');
    const documentsBucketExists = buckets?.some(b => b.name === 'property-documents');
    
    if (!imagesBucketExists) {
      console.error('❌ Bucket "property-images" not found');
      return { 
        success: false, 
        error: 'Bucket "property-images" not found. Available buckets: ' + buckets?.map(b => b.name).join(', ') 
      };
    }
    
    console.log('✅ Bucket "property-images" exists');
    
    if (!documentsBucketExists) {
      console.warn('⚠️ Bucket "property-documents" not found. Document uploads will fail until bucket is created.');
    } else {
      console.log('✅ Bucket "property-documents" exists');
    }
    
    // Test 3: Try to list files in the bucket (tests SELECT policy)
    const { data: files, error: listError } = await supabase.storage
      .from('property-images')
      .list('properties', { limit: 1 });
    
    if (listError) {
      console.warn('⚠️ Cannot list files (might be policy issue):', listError.message);
    } else {
      console.log('✅ Can read from bucket');
    }
    
    return { success: true, message: 'Supabase connection successful' };
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return { success: false, error: error.message };
  }
};

export const supabaseUpload = {
  /**
   * Upload image to Supabase Storage
   * @param {File} file - The image file to upload
   * @param {string} folder - Folder path in Supabase (e.g., 'properties')
   * @param {string} propertyId - Property ID for unique naming
   * @returns {Promise<{url: string, path: string, success: boolean}>}
   */
  uploadImage: async (file, folder = 'properties', propertyId = null) => {
    try {
      console.log('📤 Starting Supabase upload...', { file: file.name, folder, propertyId });
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = propertyId 
        ? `${propertyId}_${Date.now()}.${fileExt}`
        : `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const filePath = `${folder}/${fileName}`;
      console.log('📁 File path:', filePath);

      // Upload file to Supabase Storage
      // NOTE: Bucket name is case-sensitive! Must match exactly: 'property-images'
      console.log('📦 Attempting upload to bucket: property-images');
      console.log('🔐 Supabase client auth state:', {
        user: (await supabase.auth.getUser()).data?.user?.id || 'Not authenticated',
        session: (await supabase.auth.getSession()).data?.session ? 'Has session' : 'No session'
      });
      
      const { data, error } = await supabase.storage
        .from('property-images') // Your bucket name (case-sensitive)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        console.error('Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error,
          name: error.name
        });
        
        // Provide more helpful error messages
        if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
          throw new Error('Storage bucket "property-images" not found. Please create it in Supabase dashboard.');
        } else if (error.message?.includes('new row violates row-level security') || 
                   error.message?.includes('row-level security') ||
                   error.message?.includes('policy') ||
                   error.statusCode === 403) {
          const detailedError = `Storage policy error. Please check your Supabase storage policies.\n\nError: ${error.message}\n\nMake sure you have:\n1. An INSERT policy for "authenticated" role\n2. Policy expression: bucket_id = 'property-images' or true\n3. WITH CHECK expression: true`;
          throw new Error(detailedError);
        } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('Authentication error. Please check your Supabase API keys.');
        }
        
        throw new Error(error.message || 'Upload failed. Check browser console for details.');
      }

      console.log('✅ Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 Public URL:', publicUrl);

      return {
        url: publicUrl,
        path: filePath,
        success: true
      };
    } catch (error) {
      console.error('❌ Supabase upload error:', error);
      throw error;
    }
  },

  /**
   * Upload multiple images
   * @param {File[]} files - Array of image files to upload
   * @param {string} folder - Folder path in Supabase
   * @param {string} propertyId - Property ID for unique naming
   * @returns {Promise<Array<{url: string, path: string, success: boolean}>>}
   */
  uploadImages: async (files, folder = 'properties', propertyId = null) => {
    const uploadPromises = files.map(file => 
      supabaseUpload.uploadImage(file, folder, propertyId)
    );
    
    return Promise.all(uploadPromises);
  },

  /**
   * Upload document to Supabase Storage
   * @param {File} file - The document file to upload (PDF, DOC, DOCX, etc.)
   * @param {string} folder - Folder path in Supabase (e.g., 'properties')
   * @param {string} propertyId - Property ID for unique naming
   * @returns {Promise<{url: string, path: string, success: boolean}>}
   */
  uploadDocument: async (file, folder = 'properties', propertyId = null) => {
    try {
      console.log('📤 Starting Supabase document upload...', { file: file.name, folder, propertyId });
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = propertyId 
        ? `${propertyId}_${Date.now()}.${fileExt}`
        : `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const filePath = `${folder}/${fileName}`;
      console.log('📁 Document file path:', filePath);

      // Upload file to Supabase Storage
      // NOTE: Bucket name is case-sensitive! Must match exactly: 'property-documents'
      console.log('📦 Attempting document upload to bucket: property-documents');
      
      const { data, error } = await supabase.storage
        .from('property-documents') // Your bucket name for documents (case-sensitive)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Supabase document upload error:', error);
        console.error('Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error,
          name: error.name
        });
        
        // Provide more helpful error messages
        if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
          throw new Error('Storage bucket "property-documents" not found. Please create it in Supabase dashboard.');
        } else if (error.message?.includes('new row violates row-level security') || 
                   error.message?.includes('row-level security') ||
                   error.message?.includes('policy') ||
                   error.statusCode === 403) {
          const detailedError = `Storage policy error. Please check your Supabase storage policies.\n\nError: ${error.message}\n\nMake sure you have:\n1. An INSERT policy for "anon" role (since we use anon key)\n2. Policy expression: bucket_id = 'property-documents'\n3. WITH CHECK expression: bucket_id = 'property-documents'`;
          throw new Error(detailedError);
        } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('Authentication error. Please check your Supabase API keys.');
        }
        
        throw new Error(error.message || 'Document upload failed. Check browser console for details.');
      }

      console.log('✅ Document upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('property-documents')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 Document public URL:', publicUrl);

      return {
        url: publicUrl,
        path: filePath,
        success: true
      };
    } catch (error) {
      console.error('❌ Supabase document upload error:', error);
      throw error;
    }
  },

  /**
   * Upload multiple documents
   * @param {File[]} files - Array of document files to upload
   * @param {string} folder - Folder path in Supabase
   * @param {string} propertyId - Property ID for unique naming
   * @returns {Promise<Array<{url: string, path: string, success: boolean}>>}
   */
  uploadDocuments: async (files, folder = 'properties', propertyId = null) => {
    const uploadPromises = files.map(file => 
      supabaseUpload.uploadDocument(file, folder, propertyId)
    );
    
    return Promise.all(uploadPromises);
  },

  /**
   * Delete document from Supabase
   * @param {string} filePath - Path to the file in Supabase storage
   * @returns {Promise<{success: boolean}>}
   */
  deleteDocument: async (filePath) => {
    try {
      const { error } = await supabase.storage
        .from('property-documents')
        .remove([filePath]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Supabase document delete error:', error);
      throw error;
    }
  },

  /**
   * Delete image from Supabase
   * @param {string} filePath - Path to the file in Supabase storage
   * @returns {Promise<{success: boolean}>}
   */
  deleteImage: async (filePath) => {
    try {
      const { error } = await supabase.storage
        .from('property-images')
        .remove([filePath]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
  },

  /**
   * Upload KYC document to Supabase Storage
   * @param {File} file - The KYC document file to upload (image)
   * @param {string} userId - User ID for folder organization
   * @param {string} documentType - Type of document: 'front', 'back', or 'selfie'
   * @returns {Promise<{url: string, path: string, success: boolean}>}
   */
  uploadKycDocument: async (file, userId, documentType = 'front') => {
    try {
      console.log('📤 Starting KYC document upload to Supabase...', { 
        file: file.name, 
        userId, 
        documentType 
      });
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG and PNG images are allowed.');
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit. Please select a smaller image.');
      }
      
      // Generate unique filename: {userId}/{documentType}-{timestamp}-{randomId}.{ext}
      const fileExt = file.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const fileName = `${documentType}-${timestamp}-${randomId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      console.log('📁 KYC document file path:', filePath);

      // Upload file to Supabase Storage
      // NOTE: Bucket name is case-sensitive! Must match exactly: 'kyc-documents'
      console.log('📦 Attempting KYC document upload to bucket: kyc-documents');
      
      const { data, error } = await supabase.storage
        .from('kyc-documents') // KYC documents bucket
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Supabase KYC document upload error:', error);
        console.error('Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error,
          name: error.name
        });
        
        // Provide more helpful error messages
        if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
          throw new Error('Storage bucket "kyc-documents" not found. Please create it in Supabase dashboard.');
        } else if (error.message?.includes('new row violates row-level security') || 
                   error.message?.includes('row-level security') ||
                   error.message?.includes('policy') ||
                   error.statusCode === 403) {
          const detailedError = `❌ Supabase Storage Policy Error\n\nThe "kyc-documents" bucket needs Row Level Security (RLS) policies configured.\n\n📋 Quick Fix:\n1. Go to Supabase Dashboard > Storage > kyc-documents\n2. Click "Policies" tab\n3. Create new policy:\n   - Name: "Allow anon uploads"\n   - Operation: INSERT\n   - Role: anon\n   - USING: (bucket_id = 'kyc-documents')\n   - WITH CHECK: (bucket_id = 'kyc-documents')\n\n📄 See SUPABASE_KYC_SETUP.md for detailed instructions.\n\nAlternatively, you can make the bucket public (less secure).`;
          console.error('🔴 Supabase RLS Policy Error:', detailedError);
          throw new Error(detailedError);
        } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('Authentication error. Please check your Supabase API keys.');
        }
        
        throw new Error(error.message || 'KYC document upload failed. Check browser console for details.');
      }

      console.log('✅ KYC document upload successful:', data);

      // Get public URL (if bucket is public) or signed URL (if private)
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 KYC document public URL:', publicUrl);

      return {
        url: publicUrl,
        path: filePath,
        success: true
      };
    } catch (error) {
      console.error('❌ Supabase KYC document upload error:', error);
      throw error;
    }
  }
};

