/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

 const fs = require("fs");
 const path = require("path");
 const { exit } = require("process");
 
 //=================================================================================================
 // CLI for programmatically setting the version number and dependencies of all packages before
 // publishing.  Also used to create links for local development.
 //
 // LOCAL DEVELOPMENT:
 // 
 //     node updateDependencies.js
 // 
 // PUBLISHING:
 //
 //     node updateDependencies.js 1.0.0
 //
 //=================================================================================================
 
 const localDependencies = {
     './live-share': {},
     './live-share-media': {
         '@microsoft/live-share': '${version}:../live-share'
     }
 }
 
 const publishDependencies = {
     './live-share': {},
     './live-share-media': {
         '@microsoft/live-share': '${version}'
     }
 }
 
 const npmrcContent = `registry=https://domoreexp.pkgs.visualstudio.com/_packaging/npm-mirror/npm/registry/` +
 `\n\n`+                        
 `always-auth=true`;
 
 // Grab command line args
 let args = process.argv.slice(2);
 if (!args || args.length == 0) {
     args = ['link'];
 } else if (args.length === 1) {
     if (args[0] == "npm") {
         args = ["file"];
     }
 }
 const version = args[0];
 const isLocal = ['link', 'file'].includes(args[0]);
 
 // Validate args and notify user
 if (isLocal) {
     console.log(`Configuring packages for local building and development...`);
 } else if (/^\d+\.\d+\.\d+(|\-.*)$/.test(version)) {
     console.log(`Configuring packages as version '${version}' for publishing...`);
 } else {
     console.error(`Invalid argument of '${version}'. Pass in a valid version number like '1.0.1' or '1.0.1-preview'`);
     exit();
 }
 
 // Update packages
 const dependencies = isLocal ? localDependencies : publishDependencies;
 for (const package in dependencies) {
     // Read package.json file
     let pjson = JSON.parse(fs.readFileSync(path.resolve(package, 'package.json'), 'utf-8'));
     
     // Update package version
     if (!isLocal) {
         pjson.version = version;
     }
 
     // Update dependencies
     for (const entry in dependencies[package]) {
         let link = dependencies[package][entry].replace('${version}', version);
         pjson.dependencies[entry] = link;
     }
     
     // Save out file
     fs.writeFileSync(path.resolve(package, 'package.json'), JSON.stringify(pjson, null, 4));
     fs.writeFileSync(path.resolve("", '.npmrc'), npmrcContent);
     if (!isLocal) {
         fs.writeFileSync(path.resolve(package, '.npmrc'), npmrcContent);
     } else if (version == "file") {
         fs.unlink(path.resolve(package, 'yarn.lock'), (err) => {
             if (!err) {
                 console.log("Deleted yarn.lock file");
             }
         });
         fs.unlink(path.resolve(package, '.npmrc'), (err) => {
             if (!err) {
                 console.log("Deleted .npmrc file");
             }
         });
     }
 }