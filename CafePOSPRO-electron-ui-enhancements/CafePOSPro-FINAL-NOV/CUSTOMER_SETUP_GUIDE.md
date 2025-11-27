# CafePOSPro Customer Setup Guide - FINAL NOVEMBER 2025

## Overview

This package contains all the files you need to install and run CafePOSPro, a complete café management system. Follow this guide to set up the system for your business.

## Prerequisites

1. **Node.js** (version 16 or higher) - Download from https://nodejs.org/
2. **Internet Connection** - Required for initial setup and ongoing operation
3. **Convex Account** - Free account at https://dashboard.convex.dev

## Installation Steps

### Step 1: Install Node.js

1. Go to https://nodejs.org/
2. Download the LTS version for your operating system
3. Run the installer and follow the setup wizard
4. Restart your computer if prompted

### Step 2: Set Up Convex Account

1. Go to https://dashboard.convex.dev
2. Create a new account or sign in with an existing one
3. Create a new project in the Convex dashboard
4. Note the deployment name (e.g., `my-cafe-app-123`)

### Step 3: Configure the Application

1. Open the `convex.json` file in the project root
2. Update it with your deployment name:
   ```json
   {
     "project": "YOUR_DEPLOYMENT_NAME",
     "team": "YOUR_TEAM_NAME_IF_APPLICABLE"
   }
   ```

### Step 4: Install Dependencies

1. Open a terminal/command prompt
2. Navigate to the project directory
3. Run:
   ```
   npm install
   ```

### Step 5: Configure Authentication

1. Run the authentication setup:
   ```
   npm run deploy:setup
   ```
2. This will generate JWT keys needed for authentication

### Step 6: Deploy to Convex

1. Deploy the application:
   ```
   npm run deploy
   ```

### Step 7: Configure Environment Variables

In the Convex dashboard:
1. Go to the "Environment Variables" section
2. Add these required variables:
   - `JWT_PRIVATE_KEY`: The private key generated during auth setup
   - `SITE_URL`: The URL where the app will be hosted (e.g., https://my-cafe-app-123.convex.cloud)

### Step 8: Run the Application

For development/testing:
```
npm run dev
```

For production:
```
npm run build
```
Then serve the built files using any static file server.

## Accessing the Application

1. **Browser Access**: Visit your deployment URL (e.g., https://my-cafe-app-123.convex.cloud)
2. **Local Network Access**: The app will automatically detect your local IP address for access from other devices on the same network

## Initial Setup

After first access:
1. Create an admin account using the registration form
2. Configure restaurant settings in the Settings panel
3. Add initial inventory items
4. Set up staff accounts
5. Configure tables

## Support

For technical support, refer to:
- [CLIENT_DEPLOYMENT.md](docs/CLIENT_DEPLOYMENT.md)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [Documentation.md](docs/Documentation.md)

## Troubleshooting

### Common Issues:

1. **Authentication Errors**: Ensure JWT keys are properly configured in Convex environment variables
2. **Network Access Issues**: Verify firewall settings allow access on port 5173
3. **Data Not Loading**: Check Convex function logs in the dashboard for errors
4. **Slow Performance**: Ensure your internet connection is stable

### Getting Help

For technical support, contact the development team with:
- Screenshots of any error messages
- Steps to reproduce the issue
- Convex function logs (available in the Convex dashboard)