@echo off
echo 🚀 Deploying Edge Functions to Supabase...

echo.
echo 📦 Deploying create-teacher function...
supabase functions deploy create-teacher

echo.
echo 📦 Deploying create-student function...
supabase functions deploy create-student

echo.
echo 📦 Deploying create-admin function...
supabase functions deploy create-admin

echo.
echo ✅ Edge Functions deployment complete!
echo.
echo 🔧 Next steps:
echo 1. Set your service role key: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
echo 2. Update your .env file with VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS=true
echo 3. Test teacher creation in your app
echo.
pause