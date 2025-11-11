# CafePOSPro Client Deployment Guide

This guide explains how to deploy CafePOSPro to a client's Convex account and set up the application on their machines.

## Prerequisites

1. Node.js (version 16 or higher)
2. npm (comes with Node.js)
3. Git (optional, for version control)
4. A Convex account (client needs to create one at https://dashboard.convex.dev)

## Step 1: Client Setup - Convex Account Creation

1. Have the client go to https://dashboard.convex.dev
2. Create a new Convex account or sign in with an existing one
3. Create a new project in the Convex dashboard
4. Note the deployment name (e.g., `my-cafe-app-123`)

## Step 2: Update Project Configuration

1. Clone or download the CafePOSPro repository to your local machine
2. Navigate to the project directory
3. Update the `convex.json` file with the client's deployment name:

```json
{
  "project": "CLIENT_DEPLOYMENT_NAME",
  "team": "CLIENT_TEAM_NAME_IF_APPLICABLE"
}
```

Replace `CLIENT_DEPLOYMENT_NAME` with the actual deployment name from the client's Convex dashboard.

## Step 3: Configure Authentication

Run the authentication setup script to configure JWT keys for the client's environment:

```bash
npx @convex-dev/auth
```

This will:
- Generate new JWT keys for the client's deployment
- Update authentication configuration files
- Verify the auth setup is correct

## Step 4: Deploy to Client's Convex Account

1. Ensure you're logged into the client's Convex account:
   ```bash
   npx convex login
   ```

2. Deploy the application:
   ```bash
   npx convex deploy
   ```

This will deploy all functions, schema, and configuration to the client's Convex project.

## Step 5: Configure Environment Variables

In the Convex dashboard:
1. Go to the "Environment Variables" section
2. Add the following required variables:
   - `JWT_PRIVATE_KEY`: The private key generated during auth setup
   - `SITE_URL`: The URL where the app will be hosted (e.g., https://my-cafe-app-123.convex.cloud)

## Step 6: Data Migration (If Applicable)

If the client needs existing data:

### Option A: Export from Current System
1. Use the built-in export functionality in the app
2. Go to Settings > Backup & Export
3. Export data as CSV files
4. Import into the new system after deployment

### Option B: Direct Database Migration
1. Export data from the current Convex deployment:
   ```bash
   npx convex export --file=client-data.zip
   ```
2. Import data to the client's Convex deployment:
   ```bash
   npx convex import client-data.zip
   ```

## Step 7: Client Machine Setup

On each client machine where the app will run:

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

## Step 8: Network Configuration

For multi-device access within the client's network:

1. The application will automatically detect the local IP address
2. Staff can access the system using the network URL shown in the app
3. For external access, the client can use the Convex-hosted URL

## Step 9: Initial Setup

After deployment, the client should:

1. Access the application through their browser
2. Create an admin account using the registration form
3. Configure restaurant settings in the Settings panel
4. Add initial inventory items
5. Set up staff accounts
6. Configure tables

## Troubleshooting

### Common Issues:

1. **Authentication Errors**: Ensure JWT keys are properly configured in Convex environment variables
2. **Network Access Issues**: Verify firewall settings allow access on port 5173
3. **Data Not Loading**: Check Convex function logs in the dashboard for errors
4. **Slow Performance**: Ensure the client's internet connection is stable

### Support

For technical support, contact the development team with:
- Screenshots of any error messages
- Steps to reproduce the issue
- Convex function logs (available in the Convex dashboard)

## Maintenance

### Regular Backups
- Use the built-in backup functionality weekly
- Store backups in multiple locations (3-2-1 backup rule)

### Updates
- Pull the latest code from the repository
- Run `npm install` to update dependencies
- Deploy with `npx convex deploy`

### Monitoring
- Check Convex dashboard for function performance
- Monitor database usage in the Convex dashboard
- Review error logs regularly