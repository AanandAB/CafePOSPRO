const { spawn, spawnSync } = require("child_process");
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
  try {
    fs.mkdirSync(backupDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create backup directory:", error);
    process.exit(1);
  }
}

console.log(`Creating backup to: ${backupPath}`);

// Function to check if pg_dump exists
function checkPgDumpExists() {
  try {
    const result = spawnSync("where", ["pg_dump"], {
      shell: true,
      windowsHide: true,
    });
    return result.status === 0;
  } catch (error) {
    console.warn("Error checking if pg_dump exists:", error.message);
    return false;
  }
}

// Safe spawn function that handles cmd.exe issues
function safeSpawn(command, args, options = {}) {
  try {
    // Set default options for better compatibility
    const spawnOptions = {
      shell: true,
      windowsHide: true,
      ...options,
    };

    // On Windows, explicitly use cmd.exe if not specified
    if (process.platform === "win32" && !spawnOptions.shell) {
      spawnOptions.shell = "cmd.exe";
    }

    console.log(`Spawning process: ${command} ${args ? args.join(" ") : ""}`);
    return spawn(command, args || [], spawnOptions);
  } catch (error) {
    console.error(`Failed to spawn process (${command}):`, error);
    throw error;
  }
}

if (!checkPgDumpExists()) {
  console.error(
    "pg_dump not found. PostgreSQL might not be installed or not in PATH."
  );
  console.error(
    "Please ensure PostgreSQL is installed and added to your system PATH."
  );
  process.exit(1);
}

// Run pg_dump to create backup
const dumpProcess = safeSpawn(
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
    process.exit(code);
  }
});

writeStream.on("error", (err) => {
  console.error(`Write stream error: ${err.message}`);
  process.exit(1);
});

writeStream.on("finish", () => {
  console.log("✅ Backup file written successfully");
});
