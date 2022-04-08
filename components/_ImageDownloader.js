import Puppeteer from "puppeteer";
import UserAgent from "user-agents";
import * as fs from "fs"

async function getImage(url) {
  const browser = await Puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.setUserAgent(UserAgent.toString());

  await page.goto(url, { waitUntil: "networkidle2" });
  const productImageLink = await page.evaluate(() => {
    const image = document.querySelector(".e9r7")?.childNodes[0]?.src;
	console.log(image)
    return image;
  });
  let imageFile = await page.goto(productImageLink, { waitUntil: "networkidle2" });
  fs.writeFile('../out/photos/' + productImageLink.replace(/^.*[\\\/]/, ''), await imageFile.buffer(), (err)=>console.log(err));
  await browser.close();
}

getImage("https://www.ozon.ru/product/shapka-termit-335292766/?_bctx=CAQQsz0&asb2=SGoshx9zf1Jb57qy0vDNKy1fU4KlTwkJaB_p5GbwC_Obet3PVErf3WRJlxRBy9kE&hs=1&sh=IjUHb-jV")