const timeout = 4 * 60 * 1000; // adjust this time out as per number of windows you need to test
const chalk = require("chalk");

// functions to test for a particular player event
const isPlay = (log) =>
  log &&
  log.indexOf("MediaPlayerSynchronizer:SeekingPlayerToStartPosition") != -1;
const isPause = (log) =>
  log && log.indexOf("MediaPlayerSynchronizer:PauseAction") != -1;
const isSeek = (log) =>
  log && log.indexOf("MediaPlayerSynchronizer:SeekToAction") != -1;
const isSeekTo = (log, position) => {
  const positionStr = `"position":${position}`;

  return isSeek(log) && log.indexOf(positionStr) != -1;
};

// Class to watch log streams from all the open browser pages and count a given player event
class LogsWatcher {
  constructor(verbose) {
    this.streams = [];
    this.resetTracking();
    this.verbose = verbose;
  }

  resetTracking() {
    this.eventMatcher = () => {
      return false;
    };
    this.eventCount = 0;
  }

  startTracking(eventMatcher) {
    this.resetTracking();
    this.eventMatcher = eventMatcher;
  }

  getEventCount() {
    return this.eventCount;
  }

  onLogEvent(log) {
    if (this.eventMatcher(log)) {
      this.eventCount++;
    }
  }

  addPage(page, prefix) {
    page.on("console", (msg) => {
      this.onLogEvent(msg.text());
      if (this.verbose) {
        console.log(`${prefix} ${msg.text()}`);
      }
    });
  }
}

const delay = (timeout) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

const openNewWindow = async (page, url) => {
  page2 = await global.__BROWSER__.newPage();

  await page2.goto(url);
  await page.bringToFront();
  return page2;
};

let pageNumber = 0;
const trackPages = (logsWatcher) => {
  global.__BROWSER__.on("targetcreated", async (target) => {
    pageNumber++;
    console.log(target);
    const newPage = await target.page();
    logsWatcher.addPage(newPage, "page" + pageNumber);
  });
};

const playVideo = async (page) => {
  await page.click("#player");
  await delay(3000);
};

const seekVideo = async (page, seekTo) => {
  const duration = await page.evaluate(() => {
    return document.getElementById("player").duration;
  });
  console.log(`seekTo ${seekTo} duration ${duration}`);
  const seekRatio = Math.min(1, seekTo / duration);

  const element = await page.$("#slider-6");
  const box = await element.boundingBox();
  console.log(box);
  // move mouse to slider start
  await page.mouse.move(box.x, box.y, { steps: 5 });
  await page.mouse.down();
  // drag to seekTo location
  const finalMouseX = box.x + box.width * seekRatio;
  console.log(` move x ${finalMouseX}`);
  await page.mouse.move(finalMouseX, box.y);
  await page.mouse.up();
  await delay(1000);
};

const closeAllPages = async () => {
  const pages = await global.__BROWSER__.pages();
  for (i = 0; i < pages.lengh; i++) {
    pages[i].close();
  }
};

describe("/ (Home Page)", () => {
  let page;
  let logsWatcher;
  let numberOfWindows = 50;
  beforeAll(async () => {
    logsWatcher = new LogsWatcher(false);
    trackPages(logsWatcher);
    page = await global.__BROWSER__.newPage();
    await installMouseHelper(page);
    await page.goto("http://localhost:3000");
  });

  afterAll(async () => {});

  const verifyEvent = async (eventName, eventMatcher, cb) => {
    logsWatcher.resetTracking();
    logsWatcher.startTracking(eventMatcher);
    await cb();
    expect(logsWatcher.getEventCount()).toBe(numberOfWindows);
    console.log(chalk.green(`Successfully verified ${eventName}`));
  };

  it(
    "should play, seek, pause video for all clients",
    async () => {
      await delay(2000);
      for (i = 1; i != numberOfWindows; i++) {
        await openNewWindow(page, page.url());
      }
      await delay(1000);

      await verifyEvent("play", isPlay, async () => {
        await playVideo(page);
      });

      await delay(1000);

      await verifyEvent(
        "seek",
        (log) => {
          return isSeekTo(log, 10);
        },
        async () => {
          await seekVideo(page, 10);
        }
      );

      await delay(1000);

      await verifyEvent("pause", isPause, async () => {
        await playVideo(page);
      });

      await closeAllPages();
      await delay(1000);
    },
    timeout
  );
});

const installMouseHelper = async (page) => {
  await page.evaluateOnNewDocument(() => {
    // Install mouse helper only for top-level frame.
    if (window !== window.parent) return;
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        const box = document.createElement("puppeteer-mouse-pointer");
        const styleElement = document.createElement("style");
        styleElement.innerHTML = `
        puppeteer-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 0;
          z-index: 10000;
          left: 0;
          width: 20px;
          height: 20px;
          background: rgba(0,0,0,.4);
          border: 1px solid white;
          border-radius: 10px;
          margin: -10px 0 0 -10px;
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
        }
        puppeteer-mouse-pointer.button-1 {
          transition: none;
          background: rgba(0,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-2 {
          transition: none;
          border-color: rgba(0,0,255,0.9);
        }
        puppeteer-mouse-pointer.button-3 {
          transition: none;
          border-radius: 4px;
        }
        puppeteer-mouse-pointer.button-4 {
          transition: none;
          border-color: rgba(255,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-5 {
          transition: none;
          border-color: rgba(0,255,0,0.9);
        }
      `;
        document.head.appendChild(styleElement);
        document.body.appendChild(box);
        document.addEventListener(
          "mousemove",
          (event) => {
            box.style.left = event.pageX + "px";
            box.style.top = event.pageY + "px";
            updateButtons(event.buttons);
          },
          true
        );
        document.addEventListener(
          "mousedown",
          (event) => {
            updateButtons(event.buttons);
            box.classList.add("button-" + event.which);
          },
          true
        );
        document.addEventListener(
          "mouseup",
          (event) => {
            updateButtons(event.buttons);
            box.classList.remove("button-" + event.which);
          },
          true
        );
        function updateButtons(buttons) {
          for (let i = 0; i < 5; i++)
            box.classList.toggle("button-" + i, buttons & (1 << i));
        }
      },
      false
    );
  });
};
