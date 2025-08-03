// Fix Multiple Supabase Clients Issue
// Run this in browser console to clear all auth storage and reset

console.log('🧹 Clearing all Supabase auth storage...')

// Clear all localStorage keys related to Supabase
const keysToRemove = []
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
    keysToRemove.push(key)
  }
}

console.log('🗑️ Removing keys:', keysToRemove)
keysToRemove.forEach(key => {
  localStorage.removeItem(key)
  console.log('Removed:', key)
})

// Clear sessionStorage
const sessionKeysToRemove = []
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i)
  if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
    sessionKeysToRemove.push(key)
  }
}

console.log('🗑️ Removing session keys:', sessionKeysToRemove)
sessionKeysToRemove.forEach(key => {
  sessionStorage.removeItem(key)
  console.log('Removed from session:', key)
})

console.log('✅ Storage cleared. Now refresh the page and try logging in again.')
console.log('🔄 After refresh, check if you still see the "Multiple GoTrueClient" warning.')