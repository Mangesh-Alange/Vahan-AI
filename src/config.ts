// Auto-detect the API backend. If hosted on Firebase Hosting or Vercel, direct to Render backend.
export const API_URL = 
  (typeof window !== 'undefined' && 
   (window.location.hostname.includes('web.app') || 
    window.location.hostname.includes('firebaseapp.com') ||
    window.location.hostname.includes('vercel.app')))
    ? 'https://vahan-ai.onrender.com'
    : '';
