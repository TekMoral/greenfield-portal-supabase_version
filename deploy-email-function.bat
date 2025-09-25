@echo off
echo Deploying Email Edge Functions...
echo.

REM Deploy the send-email function
echo Deploying send-email function...
supabase functions deploy send-email

echo.
echo Deploying reset-password function...
supabase functions deploy reset-password

echo.
echo Deployment complete!
echo.
echo Don't forget to:
echo 1. Add BREVO_API_KEY to your Supabase project secrets
echo 2. Ensure SUPABASE_SERVICE_ROLE_KEY is available in Edge Functions
echo 3. Test the email functionality using the EmailTestComponent
echo 4. Test password reset from the login page
echo 5. Update your .env file with VITE_BREVO_API_KEY for development
echo.
pause