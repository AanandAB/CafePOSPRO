# CafePOSPro Client Deployment Instructions

This document provides step-by-step instructions for deploying CafePOSPro to a client's Convex account and setting up the application on their machines.

## Overview

CafePOSPro uses Convex as its backend service. To deploy to a client, you'll need to:

1. Set up a Convex account for the client
2. Configure the application for the client's deployment
3. Deploy the application code
4. Set up environment variables
5. Configure client machines

## Step-by-Step Deployment Process

### Step 1: Client Convex Account Setup

Have the client complete these steps:

1. Go to https://dashboard.convex.dev
2. Sign up for a new account or sign in with an existing one
3. Create a new project (note the deployment name, e.g., `my-cafe-123`)
4. (Optional) Create a team if multiple people will manage the account

### Step 2: Developer Configuration

As the developer, you'll need to configure the application for the client's deployment:

1. Update the [convex.json](convex.json) file with the client's deployment information:
   ```json
   {
     "project": "CLIENT_DEPLOYMENT_NAME",
     "team": "CLIENT_TEAM_NAME_IF_APPLICABLE"
   }
   ```

2. Run the authentication setup:
   ```bash
   npm run deploy:setup
   ```
   
   This will:
   - Generate new JWT keys for the client's deployment
   - Create/update the `.env.local` file with authentication keys

3. Note the generated JWT keys from `.env.local` - you'll need to provide these to the client.

### Step 3: Client Environment Configuration

Provide the client with these instructions for setting up environment variables in their Convex dashboard:

1. In the Convex dashboard, go to the "Environment Variables" section
2. Add these required variables:
   - `JWT_PRIVATE_KEY`: The private key from your `.env.local` file
   - `SITE_URL`: The URL of their deployment (e.g., https://my-cafe-123.convex.cloud)

### Step 4: Deploy the Application

Deploy the application to the client's Convex account:

```bash
npm run deploy
```

This will deploy all functions, schema, and configuration to the client's Convex project.

### Step 5: Initial Data Setup (Optional)

If the client needs sample data to get started:

1. Run the seed script:
   ```bash
   npx convex run seed:main
   ```

Or if they need to import existing data:
1. Export data from the current system:
   ```bash
   npm run export:data
   ```
2. Send the backup file to the client
3. Client imports the data:
   ```bash
   npm run import:data
   ```

### Step 6: Client Machine Setup

On each machine where the client wants to run the application:

#### Option A: Browser-Based Access (Recommended)
1. Simply visit the deployment URL: https://CLIENT_DEPLOYMENT_NAME.convex.cloud
2. No installation required

#### Option B: Local Installation
1. Install Node.js from https://nodejs.org/
2. Clone or copy the application files to the machine
3. Navigate to the project directory
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the application:
   ```bash
   npm run dev
   ```

For production use, the client can:
1. Build the application:
   ```bash
   npm run build
   ```
2. Serve the built files using any static file server

## Multi-Device Access

CafePOSPro supports multi-device access within the same network:

1. The application will automatically detect the local IP address
2. Staff can access the system using the network URL shown in the app
3. For external access, the client can use the Convex-hosted URL

## Initial Client Setup

After deployment, the client should:

1. Access the application through their browser
2. Create an admin account using the registration form
3. Configure restaurant settings in the Settings panel
4. Add initial inventory items
5. Set up staff accounts
6. Configure tables

## Ongoing Maintenance

### Updates
To update the client's deployment with new features:
1. Pull the latest code from your repository
2. Deploy to the client's Convex account:
   ```bash
   npm run deploy
   ```

### Backups
Regular backups are essential:
1. Use the built-in backup functionality weekly
2. Store backups in multiple locations (3-2-1 backup rule)
3. Test restoration periodically

### Monitoring
Clients should monitor their Convex dashboard for:
- Function performance
- Database usage
- Error logs

## Support Resources

- Convex Documentation: https://docs.convex.dev
- CafePOSPro Documentation: [README.md](README.md)
- Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)

## Troubleshooting

### Common Issues:

1. **Authentication Errors**: 
   - Ensure JWT keys are properly configured in Convex environment variables
   - Check that the SITE_URL matches the deployment URL

2. **Network Access Issues**: 
   - Verify firewall settings allow access on port 5173
   - Ensure devices are on the same network for local access

3. **Data Not Loading**: 
   - Check Convex function logs in the dashboard for errors
   - Verify the client has proper internet connectivity

4. **Slow Performance**: 
   - Ensure the client's internet connection is stable
   - Check Convex dashboard for function performance issues

### Getting Help

For technical support, contact the development team with:
- Screenshots of any error messages
- Steps to reproduce the issue
- Convex function logs (available in the Convex dashboard)