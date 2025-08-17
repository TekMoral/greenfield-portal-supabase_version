// Carousel Storage Setup for Supabase
// This file contains the setup instructions for carousel images storage

/**
 * SUPABASE STORAGE BUCKET SETUP
 * 
 * 1. Go to your Supabase Dashboard
 * 2. Navigate to Storage
 * 3. Create a new bucket called 'carousel-images'
 * 4. Set the bucket to be public (for image display)
 * 5. Configure the following policies:
 */

export const STORAGE_BUCKET_POLICIES = `
-- Enable public access for carousel images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'carousel-images');

-- Allow authenticated users to upload carousel images
CREATE POLICY "Authenticated users can upload carousel images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update carousel images
CREATE POLICY "Authenticated users can update carousel images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete carousel images
CREATE POLICY "Authenticated users can delete carousel images" ON storage.objects 
FOR DELETE USING (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');
`;

/**
 * DATABASE TABLE SCHEMA
 * 
 * Make sure your carousel_images table has these columns:
 */

export const DATABASE_SCHEMA = `
-- Update carousel_images table to include storage_path and file info
ALTER TABLE carousel_images 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Update existing records to have default values
UPDATE carousel_images 
SET storage_path = COALESCE(storage_path, ''),
    file_size = COALESCE(file_size, 0),
    file_type = COALESCE(file_type, 'image/jpeg')
WHERE storage_path IS NULL OR file_size IS NULL OR file_type IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_carousel_images_active ON carousel_images(is_active);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(display_order);
`;

/**
 * BUCKET CONFIGURATION
 */
export const BUCKET_CONFIG = {
  name: 'carousel-images',
  public: true,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp'
  ],
  fileSizeLimit: 10 * 1024 * 1024, // 10MB
  folder: 'carousel' // Subfolder for organization
};

/**
 * Setup function to create bucket programmatically (if needed)
 */
export const setupCarouselStorage = async (supabaseAdmin) => {
  try {
    // Create bucket
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage
      .createBucket('carousel-images', {
        public: true,
        allowedMimeTypes: BUCKET_CONFIG.allowedMimeTypes,
        fileSizeLimit: BUCKET_CONFIG.fileSizeLimit
      });

    if (bucketError && bucketError.message !== 'Bucket already exists') {
      console.error('Error creating bucket:', bucketError);
      return { success: false, error: bucketError.message };
    }

    console.log('✅ Carousel storage bucket setup complete');
    return { success: true, bucket };
  } catch (error) {
    console.error('Error setting up carousel storage:', error);
    return { success: false, error: error.message };
  }
};

export default {
  STORAGE_BUCKET_POLICIES,
  DATABASE_SCHEMA,
  BUCKET_CONFIG,
  setupCarouselStorage
};