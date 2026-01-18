import { supabase } from '@/integrations/supabase/client';

/**
 * Creates a signed URL for accessing a private storage file.
 * Signed URLs are short-lived and require authentication to generate.
 * 
 * @param filePath - The path to the file in storage (not a full URL)
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if there was an error
 */
export const getSignedPhotoUrl = async (
  filePath: string | null | undefined, 
  expiresIn = 3600
): Promise<string | null> => {
  if (!filePath) return null;
  
  // If already a full URL (legacy data), return as-is but log a warning
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    console.warn('Legacy public URL detected, should migrate to signed URLs:', filePath);
    return filePath;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('patient-photos')
      .createSignedUrl(filePath, expiresIn);
      
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error('Exception creating signed URL:', err);
    return null;
  }
};

/**
 * Creates multiple signed URLs for an array of file paths.
 * 
 * @param filePaths - Array of file paths
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Object mapping paths to signed URLs
 */
export const getSignedPhotoUrls = async (
  filePaths: (string | null | undefined)[],
  expiresIn = 3600
): Promise<Record<string, string | null>> => {
  const results: Record<string, string | null> = {};
  
  const validPaths = filePaths.filter((p): p is string => !!p);
  
  if (validPaths.length === 0) return results;
  
  // Process in parallel for efficiency
  const promises = validPaths.map(async (path) => {
    results[path] = await getSignedPhotoUrl(path, expiresIn);
  });
  
  await Promise.all(promises);
  
  return results;
};

/**
 * Uploads a file to patient photos storage and returns the file path (not public URL).
 * 
 * @param file - The file to upload
 * @param userId - The user's ID (for folder organization)
 * @param patientId - The patient's ID (for folder organization)
 * @param photoType - Type of photo (e.g., 'resting', 'glabellar')
 * @returns The file path or null if upload failed
 */
export const uploadPatientPhoto = async (
  file: File,
  userId: string,
  patientId: string,
  photoType: string
): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${patientId}/${photoType}-${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('patient-photos')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return null;
  }

  // Return just the file path, not a public URL
  return fileName;
};
