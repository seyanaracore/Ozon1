import Puppeteer from "puppeteer";
import UserAgent from "user-agents";

async function checkIp() {
  const browser = await Puppeteer.launch({
    headless: false,
    defaultViewport: null,
	args: ['--proxy-server=194.85.180.5:60482']
  });
  const page = await browser.newPage();
  await page.setUserAgent(UserAgent.toString());
  
  await page.authenticate({
    username: 'jCNpDSrT',
    password: 'Wf6nmznM',
  });

  await page.goto('https://whoer.net', { waitUntil: "networkidle2" });
}
checkIp()