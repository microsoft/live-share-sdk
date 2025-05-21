/**
 * This script is used to diagnose npm install issues in GitHub Actions.
 * It provides visibility into the npm install process and helps identify
 * potential bottlenecks or problematic dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Log system information
console.log('=== SYSTEM INFORMATION ===');
console.log('Node version:', process.version);
console.log('NPM version:', execSync('npm --version').toString().trim());
console.log('OS:', process.platform, process.arch);
console.log('Memory:', execSync('free -h').toString());
console.log('Disk space:', execSync('df -h').toString());

// Log package.json information
console.log('\n=== PACKAGE INFORMATION ===');
const rootPackageJson = require('../package.json');
console.log('Root package name:', rootPackageJson.name);
console.log('Workspaces:', rootPackageJson.workspaces);

// Count total dependencies
let totalDeps = 0;
const countDeps = (deps) => {
  if (!deps) return 0;
  return Object.keys(deps).length;
};

totalDeps += countDeps(rootPackageJson.dependencies);
totalDeps += countDeps(rootPackageJson.devDependencies);

// Find and parse all workspace package.json files
const workspacePackages = [];
rootPackageJson.workspaces.forEach(workspacePattern => {
  // Handle glob patterns in workspaces
  let workspaceFolders = [];
  if (workspacePattern.includes('*')) {
    const baseDir = workspacePattern.split('/*')[0];
    if (fs.existsSync(baseDir)) {
      const subDirs = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(baseDir, dirent.name));
      workspaceFolders = subDirs;
    }
  } else {
    workspaceFolders = [workspacePattern];
  }
  
  workspaceFolders.forEach(folder => {
    const packageJsonPath = path.join(folder, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = require(`../${packageJsonPath}`);
        workspacePackages.push({
          name: packageJson.name,
          path: folder,
          deps: countDeps(packageJson.dependencies) + countDeps(packageJson.devDependencies)
        });
        totalDeps += countDeps(packageJson.dependencies);
        totalDeps += countDeps(packageJson.devDependencies);
      } catch (err) {
        console.error(`Error parsing ${packageJsonPath}:`, err.message);
      }
    }
  });
});

console.log('\nWorkspace packages:');
workspacePackages.forEach(pkg => {
  console.log(`- ${pkg.name} (${pkg.path}): ${pkg.deps} dependencies`);
});

console.log(`\nTotal dependencies across all packages: ${totalDeps}`);

// Check for potential issues
console.log('\n=== POTENTIAL ISSUES ===');

// Check package-lock.json
const lockfileSize = fs.statSync('../package-lock.json').size;
console.log(`package-lock.json size: ${(lockfileSize / 1024 / 1024).toFixed(2)} MB`);
if (lockfileSize > 1024 * 1024) {
  console.log('Warning: Large package-lock.json may slow down npm operations');
}

// Check for custom npm hooks
console.log('\nChecking for lifecycle scripts that might slow down installation:');
if (rootPackageJson.scripts) {
  const lifecycleScripts = ['preinstall', 'install', 'postinstall', 'prepare'];
  lifecycleScripts.forEach(script => {
    if (rootPackageJson.scripts[script]) {
      console.log(`- Root package has ${script} script: ${rootPackageJson.scripts[script]}`);
    }
  });
}

// Suggest optimizations
console.log('\n=== OPTIMIZATION SUGGESTIONS ===');
console.log('1. Consider using npm cache with GitHub Actions for faster installations');
console.log('2. Ensure NODE_OPTIONS="--max-old-space-size=4096" is set for large projects');
console.log('3. Check npm version compatibility (current version:', process.env.npm_config_node_version || execSync('npm --version').toString().trim(), ')');
console.log('4. Consider breaking down large monorepos into smaller packages');
console.log('5. Review and remove unnecessary dependencies');
console.log('6. Use direct directory changes instead of workspace flags if issues persist');

console.log('\nDiagnostic information collection complete.');