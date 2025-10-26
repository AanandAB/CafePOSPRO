# CafePOSPro - Complete Café Management System

This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).

This project is connected to the Convex deployment named [`calculating-snake-122`](https://dashboard.convex.dev/d/calculating-snake-122).

## Project structure

The frontend code is in the `src` directory and is built with [Vite](https://vitejs.dev/).

The backend code is in the `convex` directory.

`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Staff PIN login for easy sign in. Staff members can log in with their email and PIN, while managers can use full email/password authentication.

## New Features

### Multi-Device Access

- Staff can access the app through browsers on any device within the same WiFi network
- Real-time synchronization across all devices ensures consistent data

### Staff Authentication

- Staff members log in with their email and PIN
- Different access levels based on role (manager, cashier, waiter, kitchen)
- Kitchen staff have a dedicated dashboard view

### Real-time Order Management

- When an order is created, it's immediately visible to all devices
- Kitchen staff receive notifications for new orders
- Stock levels update in real-time across all devices
- When one staff member takes an order that reduces stock, other staff members immediately see the updated quantities

### Kitchen Workflow

- Dedicated kitchen dashboard for preparing orders
- Real-time status updates (pending → preparing → ready → served)
- Notifications when new orders arrive

### Inventory Image Management

- Add images to inventory items for visual menu display
- Image preview before saving
- Visual selection in POS system

### Desktop Application Manager

- Easy start/stop of the entire system
- Real-time logs and network address display
- One-click backup creation

## Data Backup and Management

### Built-in Backup System

CafePOSPro includes a comprehensive backup system to protect your business data:

1. **Create Backups**: Use the desktop app's "Create Backup" button or run `npm run db:backup`
2. **Backup Format**: Standard SQL format compatible with PostgreSQL
3. **Restore Data**: Use PostgreSQL tools to restore from backup files

### When to Create Backups

- **Daily**: At the end of each business day
- **Before Updates**: Prior to major system changes
- **After Inventory Changes**: After adding significant inventory
- **Weekly Archival**: For long-term data retention

### Backup Best Practices

1. **3-2-1 Rule**: Keep 3 copies of your data (1 primary + 2 backups), on 2 different media, with 1 offsite
2. **Automate When Possible**: Schedule regular backups using system tools
3. **Test Restores**: Periodically verify your backups can be restored
4. **Encrypt Sensitive Data**: Protect backup files with encryption
5. **Version Your Backups**: Keep multiple versions with dates
6. **Monitor Backup Success**: Check logs to ensure backups complete successfully
7. **Store Securely**: Keep backups in fireproof safes or cloud storage

### Storage Limits and Management

**Free Plan Storage**: 1GB database storage (more than enough for most cafes)

**Typical Cafe Usage**: ~20-30MB per month for orders, inventory, and staff data

**Time to Reach Limit**: 30+ months for average cafe usage

**What Counts Toward Storage**:

- Database records (orders, inventory, staff, etc.)
- Uploaded images and files

**What Doesn't Count**:

- Application code
- Frontend assets (HTML, CSS, JS)

**Warning System**: You'll receive email alerts at 80% and 95% usage

**Solutions if Approaching Limit**:

1. Export and archive old data
2. Compress images before upload
3. Upgrade to paid plan ($19/month for 10GB)

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.

- If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
- Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
- Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
