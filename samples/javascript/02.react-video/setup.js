const chalk = require("chalk");
const puppeteer = require("puppeteer");
const fs = require("fs");
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");

module.exports = async function () {
    console.log(chalk.green("Setup Puppeteer"));
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        // if you are an OS user, please use "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    });
    // This global is not available inside tests but only in global teardown
    global.__BROWSER_GLOBAL__ = browser;
    // Instead, we expose the connection details via file system to be used in tests
    mkdirp.sync(DIR);
    fs.writeFileSync(path.join(DIR, "wsEndpoint"), browser.wsEndpoint());
};
