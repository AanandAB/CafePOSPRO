# CafePOSPro EXE Builder

This package contains all the necessary files to build a standalone Windows executable (EXE) for CafePOSPro.

## Prerequisites

Before building the EXE, ensure you have:

1. **Node.js** (version 16 or higher) installed on your system
2. **npm** (comes with Node.js)
3. **Windows PC** (required for building Windows EXE)

## Building the EXE

### Method 1: Using the Build Script (Recommended)

1. Double-click `build-exe.bat`
2. Wait for the build process to complete
3. The EXE installer will be created in the `dist` folder

### Method 2: Manual Build

1. Open Command Prompt or PowerShell in this directory
2. Run the following commands:

```bash
# Install dependencies
npm install

# Navigate to the app directory
cd cafepospro-app

# Install app dependencies
npm install

# Build the web application
npm run build

# Return to the parent directory
cd ..

# Create the EXE package
npm run dist
```

## Output Files

After successful build, you will find:

- **Installer**: `dist/CafePOSPro Desktop Setup 1.0.0.exe`
- **Portable Version**: `dist/CafePOSPro Desktop 1.0.0.exe`
- **Other files**: Additional installation files in the `dist` folder

## Features of the EXE Version

1. **Standalone Application**: No need to install additional software (Node.js bundled)
2. **Data Persistence**: All data is stored locally and persists between sessions
3. **Offline Capability**: Works without internet connection (except for Convex sync)
4. **System Integration**: Creates desktop shortcuts and integrates with Windows
5. **Auto Updates**: Can be configured to auto-update (requires additional setup)

## Convex Configuration

After installing the EXE:

1. Run the application once to initialize
2. Close the application
3. Configure Convex settings in the installation directory:
   - Navigate to `%LOCALAPPDATA%/cafepospro-desktop/app-1.0.0/resources/cafepospro-app`
   - Follow the standard Convex setup procedure
   - Run `npx @convex-dev/auth` to configure authentication
   - Set environment variables in the Convex dashboard

## Data Storage

The application stores data in:
- **Windows**: `%APPDATA%\cafepospro-desktop\cafepospro-data`

This ensures data persistence between application updates.

## Troubleshooting

### If the build fails:

1. Ensure Node.js is properly installed (`node --version`)
2. Check that you have sufficient disk space
3. Verify internet connectivity for downloading dependencies
4. Try clearing npm cache: `npm cache clean --force`

### If the EXE doesn't run:

1. Check Windows Defender or antivirus software
2. Ensure Windows is up to date
3. Verify all required Visual C++ redistributables are installed

## Customization

To customize the build:

1. Modify `package.json` to change app name, version, etc.
2. Replace `build/icon.ico` with your custom icon
3. Adjust build settings in the `build` section of `package.json`

## Support

For technical support, contact the development team with:
- Error messages
- Steps to reproduce issues
- System specifications