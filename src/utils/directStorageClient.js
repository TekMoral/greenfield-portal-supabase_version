// src/utils/directStorageClient.js
// Direct storage client that bypasses Supabase client library issues

const SUPABASE_URL = 'https://ryiqdiqcmvwdotnrosac.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5aXFkaXFjbXZ3ZG90bnJvc2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTM2MzAsImV4cCI6MjA2OTAyOTYzMH0.xPxrEU24W2zRftlL2X3VbT_yfMLt-8eq56QfhM3JzFg'

const getHeaders = () => ({
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY
})

export const directStorageClient = {
  // Upload file to bucket
  upload: async (bucketName, fileName, file) => {
    try {
      const formData = new FormData()
      formData.append('file', file, fileName)
      
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Get public URL for file
  getPublicUrl: (bucketName, fileName) => {
    return `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`
  },

  // Delete file
  remove: async (bucketName, fileName) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Delete failed: ${response.status} ${errorText}`)
      }
      
      return { data: { message: 'File deleted' }, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // List files in bucket
  list: async (bucketName, folder = '') => {
    try {
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucketName}${folder ? '/' + folder : ''}`, {
        headers: getHeaders()
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`List failed: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }
}

export default directStorageClient