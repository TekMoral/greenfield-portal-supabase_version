# Environment Setup Guide

This document explains how to properly configure environment variables for the School Portal application.

## Required Environment Variables

The application requires the following environment variables to be set in a `.env` file in the root directory:

### Supabase Configuration
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```


## Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Get Supabase credentials:**
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings > API
   - Copy the Project URL and anon/public key
   - Replace the placeholder values in your `.env` file


## Security Best Practices

- ✅ **DO:** Keep your `.env` file in `.gitignore`
- ✅ **DO:** Use environment variables for all sensitive data
- ✅ **DO:** Use different credentials for development and production
- ❌ **DON'T:** Commit `.env` files to version control
- ❌ **DON'T:** Hardcode API keys or URLs in source code
- ❌ **DON'T:** Share your environment variables publicly

## Validation

The application includes automatic validation for environment variables:

- Checks that all required variables are present
- Validates URL format for Supabase URL
- Warns if the anon key doesn't appear to be a valid JWT

If validation fails, the application will show a clear error message indicating what needs to be fixed.

## Troubleshooting

### "Missing Supabase environment variables" error
- Ensure your `.env` file exists in the root directory
- Check that variable names match exactly (including `VITE_` prefix)
- Restart your development server after adding environment variables

### "Invalid VITE_SUPABASE_URL format" error
- Ensure your Supabase URL is a complete URL (e.g., `https://your-project.supabase.co`)
- Check for typos in the URL

### Authentication not working
- Verify your Supabase anon key is correct
- Check that your Supabase project is active
- Ensure RLS (Row Level Security) policies are properly configured