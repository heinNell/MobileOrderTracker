module.exports = {
  env: {
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  },
  headers: () => [
    {
      source: '/api/locations',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://regal-quokka-de7e35.netlify.app' }
      ]
    }
  ]
};
