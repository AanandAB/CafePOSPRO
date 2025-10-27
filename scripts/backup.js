const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Get command line arguments
const args = process.argv.slice(2);
let backupPath = args[0];

// If no path provided, create default path
if (!backupPath) {
  const date = new Date().toISOString().split("T")[0];
  backupPath = path.join(process.cwd(), `cafepospro-backup-${date}.sql`);
}

// Ensure backup directory exists
const backupDir = path.dirname(backupPath);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log(`Creating backup to: ${backupPath}`);

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
    console.log(`✅ Backup created successfully at ${backupPath}`);
  } else {
    console.error(`❌ Backup failed with exit code ${code}`);
  }
});

writeStream.on("error", (err) => {
  console.error(`Write stream error: ${err.message}`);
});

writeStream.on("finish", () => {
  console.log("✅ Backup file written successfully");
});
