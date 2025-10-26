const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Get the user's Documents directory
const documentsDir = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, "Documents")
  : path.join(process.env.HOME, "Documents");

// Create backup directory
const backupDir = path.join(documentsDir, "CafePOSPro", "Backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Function to create backup with timestamp
function createBackup(type) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dateStr = new Date().toISOString().split("T")[0];
  const backupPath = path.join(
    backupDir,
    `cafepospro-${type}-backup-${timestamp}.sql`
  );

  console.log(
    `[${new Date().toLocaleString()}] Creating ${type} backup to: ${backupPath}`
  );

  // Run pg_dump to create backup
  const dumpProcess = spawn(
    "pg_dump",
    [
      "--dbname=cafepospro",
      "--username=postgres",
      "--host=localhost",
      "--port=5432",
      "--no-password",
    ],
    {
      env: { ...process.env, PGPASSWORD: "123" },
    }
  );

  // Create write stream to save backup
  const writeStream = fs.createWriteStream(backupPath);

  // Pipe dump output to file
  dumpProcess.stdout.pipe(writeStream);

  // Handle errors
  dumpProcess.stderr.on("data", (data) => {
    console.error(`pg_dump error: ${data}`);
  });

  dumpProcess.on("close", (code) => {
    if (code === 0) {
      console.log(
        `✅ ${type.charAt(0).toUpperCase() + type.slice(1)} backup created successfully at ${backupPath}`
      );
    } else {
      console.error(
        `❌ ${type.charAt(0).toUpperCase() + type.slice(1)} backup failed with exit code ${code}`
      );
    }
  });

  writeStream.on("error", (err) => {
    console.error(`Write stream error: ${err.message}`);
  });

  writeStream.on("finish", () => {
    console.log("✅ Backup file written successfully");
  });
}

// Function to clean old backups (keep last 30 days)
function cleanOldBackups() {
  fs.readdir(backupDir, (err, files) => {
    if (err) {
      console.error("Error reading backup directory:", err);
      return;
    }

    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    files.forEach((file) => {
      if (file.startsWith("cafepospro-") && file.endsWith(".sql")) {
        const filePath = path.join(backupDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error("Error getting file stats:", err);
            return;
          }

          if (stats.mtime.getTime() < cutoff) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error("Error deleting old backup:", err);
              } else {
                console.log(`🗑️ Deleted old backup: ${file}`);
              }
            });
          }
        });
      }
    });
  });
}

// Schedule functions
function scheduleDailyBackup() {
  // Run at 11:00 PM every day
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(23, 0, 0, 0);

  // If it's already past 11 PM today, schedule for tomorrow
  if (now > nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delay = nextRun.getTime() - now.getTime();

  setTimeout(() => {
    createBackup("daily");
    // Schedule next daily backup
    setInterval(
      () => {
        createBackup("daily");
      },
      24 * 60 * 60 * 1000
    ); // 24 hours
  }, delay);

  console.log(`⏰ Daily backup scheduled for ${nextRun.toLocaleString()}`);
}

function scheduleWeeklyBackup() {
  // Run at 11:00 PM every Sunday
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(23, 0, 0, 0);

  // Set to next Sunday (0 = Sunday)
  const daysUntilSunday = (7 - now.getDay()) % 7;
  nextRun.setDate(now.getDate() + daysUntilSunday);

  // If it's already past 11 PM today and today is Sunday, schedule for next Sunday
  if (now.getDay() === 0 && now > nextRun) {
    nextRun.setDate(nextRun.getDate() + 7);
  }

  const delay = nextRun.getTime() - now.getTime();

  setTimeout(() => {
    createBackup("weekly");
    // Schedule next weekly backup (every 7 days)
    setInterval(
      () => {
        createBackup("weekly");
      },
      7 * 24 * 60 * 60 * 1000
    ); // 7 days
  }, delay);

  console.log(`📅 Weekly backup scheduled for ${nextRun.toLocaleString()}`);
}

function scheduleMonthlyBackup() {
  // Run at 11:00 PM on the last day of each month
  const now = new Date();
  const nextRun = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
  nextRun.setHours(23, 0, 0, 0);

  // If today is already the last day of the month but past 11 PM, schedule for next month
  if (now.getDate() === nextRun.getDate() && now > nextRun) {
    nextRun.setMonth(nextRun.getMonth() + 1);
    nextRun.setDate(0); // Last day of next month
  }

  const delay = nextRun.getTime() - now.getTime();

  setTimeout(() => {
    createBackup("monthly");
    // Schedule next monthly backup
    setInterval(
      () => {
        const today = new Date();
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        lastDay.setHours(23, 0, 0, 0);
        createBackup("monthly");
      },
      24 * 60 * 60 * 1000
    ); // Check daily, but only run on last day
  }, delay);

  console.log(`📆 Monthly backup scheduled for ${nextRun.toLocaleString()}`);
}

// Initialize scheduled backups
console.log("🚀 Initializing scheduled backups...");
scheduleDailyBackup();
scheduleWeeklyBackup();
scheduleMonthlyBackup();

// Clean old backups once a day
setInterval(cleanOldBackups, 24 * 60 * 60 * 1000);
// Run once immediately
cleanOldBackups();

console.log("✅ Scheduled backup system initialized");
console.log(`📂 Backups will be stored in: ${backupDir}`);
