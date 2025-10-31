console.log(`
=====================================
 CafePOSPro Backup Information
=====================================

💾 BACKUP COMMAND:
npm run db:backup

📝 WHAT THIS DOES:
- Creates a complete backup of your cafe data
- Saves as SQL file compatible with PostgreSQL
- Includes all orders, inventory, staff, and settings

📍 WHERE BACKUPS ARE SAVED:
- Default location: Current directory
- File name format: cafepospro-backup-[date].sql
- You can specify custom location: npm run db:backup /path/to/backup.sql

📋 BEST PRACTICES:
1. Create daily backups at end of business day
2. Keep 3 copies (1 primary + 2 backups)
3. Store backups in different locations
4. Test restore process periodically
5. Archive old backups for long-term storage

⚠️ STORAGE LIMITS:
- Free plan: 1GB database storage
- Typical cafe usage: ~20-30MB per month
- Time to reach limit: 30+ months
- You'll get email warnings at 80% and 95% usage

🔧 SOLUTIONS IF APPROACHING LIMIT:
1. Export and archive old data
2. Compress images before upload
3. Upgrade to paid plan ($19/month for 10GB)

📧 Need help?
Check the README.md file for complete backup documentation
`);
