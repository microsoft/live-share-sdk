const chalk = require("chalk");
const puppeteer = require("puppeteer");

const allTestsCompletedPrefix = "AllTestsCompleted: ";
const wetStrokeTestFailedPrefix = "WetStrokeTestFailed: ";
const dryCanvasTestFailedPrefix = "DryCanvasTestFailed: ";

function isError(logMessage) {
    return logMessage.startsWith(wetStrokeTestFailedPrefix) || logMessage.startsWith(dryCanvasTestFailedPrefix);
}

function delay(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

describe("Synchronized inking", () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({ headless: false });
    });

    afterAll(async () => {
        await browser.close();
    });

    it("should render the same on local and remote", async () => {
        const errorMessages = [];
        let allTestsCompleted = false;

        page = await browser.newPage();
        page.on("console", (msg) => {
            const messageText = msg.text();

            if (isError(messageText)) {
                errorMessages.push(messageText);
            } else if (messageText.startsWith(allTestsCompletedPrefix) && !allTestsCompleted) {
                allTestsCompleted = true;
            }
        });

        await page.goto("http://localhost:8080?startTest=true");

        const checkCompletion = async () => {
            if (!allTestsCompleted) {
                await delay(1000);
                await checkCompletion();
            }
        };

        await checkCompletion();

        for (const errorMessage of errorMessages) {
            console.log(chalk.red(errorMessage));
        }

        expect(errorMessages.length).toBe(0);
    }, 100000);
});
