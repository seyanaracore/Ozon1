import Puppeteer from "puppeteer";
import UserAgent from "user-agents";
import settings from "./components/settings.js";
import {openStreamWriting, writeData, closeStream, getDateAndTime} from "./utils/FillOutputTextFile.js"
import proxyList from "./utils/Proxy.js";
import {openProductsListStream, writeProuctsLinks, closeProductsListStream} from "./utils/SaveProductsLinks.js"

const launchId = settings.sellerUrl.split("seller/")[1].split("/")[0] + "_" + getDateAndTime()
let writeStream, productsStream
const fetchedData = [];
const rejectedProducts = []

const {sellerUrl,productIteratationDelay,productsCountPerPage,pagesHandlingCount,initialIterationPage,pageHandlingThreads, maxDelay, productsPerPageMax,delayUpper, threads} = settings
openStreamWriting(launchId)
openProductsListStream(launchId)

async function fetchProductsLinks(url, delay = productIteratationDelay ,browser) {
  const page = await browser.newPage();
  await page.setUserAgent(UserAgent.toString());

  await page.waitForTimeout(delay*1000)
  await page.goto(url, { waitUntil: "networkidle2" });
  const pageLinks = await page.evaluate(() => {
    const goods = document.querySelectorAll(".bh6");
    const links = [];
    const pageError = document.querySelector(".f9g7")?.textContent?.match("не нашлось")
	const captcha = document.querySelector("#main-iframe")?.contentWindow?.document?.querySelector(".error-content")
    if (pageError) {
      return null
    }
	if(captcha) return links
    for (let good of goods) {
      const link = good?.childNodes[0]?.href;
      links.push(link);
    }
    return links;
  });
  await page.close()
  return pageLinks;
}

async function fetchProductsDataOnPage(urls, delay = productIteratationDelay, proxy = false) {
  const browser = await Puppeteer.launch({
    headless: true,
    defaultViewport: null,
	args: [proxy ? `--proxy-server=${proxy.ip}` : ""]
  });
  const page = await browser.newPage();
  await page.setUserAgent(UserAgent.toString());
  
  if(proxy) {
	await page.authenticate({
		username: proxy.username,
		password: proxy.password,
	});
  }

  for (let i = 1; i <= urls.length; i++) {
	let url = urls[i-1]
	const getMin = () => (Math.ceil(i/productsPerPageMax)-1)*productsPerPageMax
	const getMax = () => getMin() + productsCountPerPage
	if (!(i > getMin() && i <= getMax())) {
		continue
	}
	await page.waitForTimeout(delay * 1000)
    await page.goto(url, { waitUntil: "load" });
    const productData = await page.evaluate(async () => {
	  try{
		  //Constants
		  window.defaultImageSize = 1200;
		  window.setImageSize = "";
		  window.delayIterateVarieties = 2;
		  window.frequencyProductCodeCheck = 1;
			window.isPageErrorTimer = 5

		  //Selectors
		  window.codeSelector = ".fk1";
		  window.imageSelector = ".e9r7";
		  window.productVarietiesSelector = ".ui-i2 > div > button.ui-f3";
		  window.activeProudctVarietySelector = "f0d8";
		  window.captchaSelectors = ["#main-iframe",".error-content"]
		  window.errorPageSelector = ".a3q7";

		  //Getters
		  window.getProductImageUrl = () => {
			return document.querySelector(window.imageSelector)?.childNodes[0]?.src;
		  };
		  window.getProductCode = () => {
			return document
			  .querySelector(window.codeSelector)
			  ?.textContent.split(": ")[1];
		  };

		  //GlobalIterator
		  window.iterator = 0;

		  //Variables
		  window.productData = {
			codes: [],
			images: [],
		  };
		  window.productCode = false
		  window.productVarieties = document.querySelectorAll(
			productVarietiesSelector
		  );
		  //Functions
		  window.checkCaptcha = () => {
			 if (document.querySelector(captchaSelectors[0])?.contentWindow?.document?.querySelector(captchaSelectors[1])) {
				 return true
			 } else {
				 return false
			 }
		  }
		  window.checkPageError = () => {
			  if(document.querySelector(errorPageSelector)?.textContent?.match("не существует")) {
				  return true
			  } else {
				  return false
			  }
		  }
		  
		  window.fillProductData = async () => new Promise ((resolve) => {
			let timer = setTimeout(()=>resolve(), window.isPageErrorTimer * 1000)
			let interval = setInterval(() => {
			  const actualPageProductCode = window.getProductCode();
			  if (actualPageProductCode !== window.productCode) {
				window.productCode = actualPageProductCode;
				let code = window.getProductCode();
				let image = window.getProductImageUrl();
				if (window.setImageSize) {
				  image = image?.replace(
					`/wc${window.defaultImageSize}`,
					`/wc${window.setImageSize}`
				  );
				}
				window.productData.codes.push(code);
				window.productData.images.push(image);
				clearInterval(interval)
				clearTimeout(timer)
				resolve()
			  }
			}, window.frequencyProductCodeCheck * 1000);
		  })

		  window.iterateProductVarieties = async () => {
			for (;window.iterator <= window.productVarieties.length; window.iterator += 1) {
			  await new Promise((resolve) => {
				setTimeout(() => resolve(), window.delayIterateVarieties * 1000);
			  });
			  //waiting to avoid blocking
			  const varietiesInIterate = document.querySelectorAll(window.productVarietiesSelector);

			  /*if (window.productVarieties.length < varietiesInIterate.length) */window.productVarieties = varietiesInIterate;
			  //checking for a larger varieties list
			  await window.fillProductData();
			  productVarieties[window.iterator]?.click();
				  if (window.iterator === 0 && window.productVarieties[window.iterator]?.childNodes[0]?.childNodes[0]?.classList.contains(window.activeProudctVarietySelector)) {
				productVarieties[window.iterator + 1]?.click();
			  }
			}
			if(!window.productVarieties.length){
			  await window.fillProductData()
			}
		  };
		  
		  if (window.checkCaptcha()) {
			window.productData = false
		  } else if (window.checkPageError()) {
			  return window.productData;
		  } else {
			await window.iterateProductVarieties();
		  }
	  } catch {
		  window.productData = false
	  }
	  return window.productData;
    });
	if(!productData) {
		rejectedProducts.push(url)
		delay += delayUpper
		if(delay > maxDelay) delay = maxDelay
		console.log("product:", i, "current page:", Math.ceil(i/productsPerPageMax), url, "rejected")
	} else {
	  delay = productIteratationDelay
	  console.log("codes:", productData.codes.length, "images:", productData?.images.length, "product:", i, "current page", Math.ceil(i/productsPerPageMax))
	  writeData(productData)
	}
  }
  await browser.close();
  return fetchedData;
}
async function getProductsLinksList (sellerUrl) {
  const browser = await Puppeteer.launch({
    headless: true,
    defaultViewport: null,
    //args: ['--proxy-server='+ proxyNumber]
  });
  let delay = productIteratationDelay
  const pagesProductsLinks = []
  const rejectedLinks = []
	for (let i = initialIterationPage || 1; i<999;i++) {
		if(pagesHandlingCount && i === pagesHandlingCount + (initialIterationPage || 1)) {
			return pagesProductsLinks
		}
		let pageUrl = sellerUrl.slice(0,sellerUrl.lastIndexOf("?")) + `?page=${i}&sorting=price_desc`
		let linksList = await fetchProductsLinks(pageUrl, delay, browser)
		if (!linksList) break
		if(!linksList.length) {
		  console.log("page:",i,"rejected")
		  rejectedLinks.push({pageUrl,i})
		  delay += delayUpper
		  if(delay > maxDelay) delay = maxDelay
		} else {
			console.log(pageUrl, "page:", i, "products:", linksList.length)
			writeProuctsLinks(linksList)
			pagesProductsLinks.push(...linksList)
			delay = productIteratationDelay
		}
	}
  console.log("succesful products fetched:", pagesProductsLinks.length)
    console.log("rejected links:",rejectedLinks.length)
  while(rejectedLinks.length){
    let pageUrl = rejectedLinks[0].pageUrl
    let linksList = await fetchProductsLinks(pageUrl,delay, browser)
	if(!linksList) {
		break
	}
    if(linksList.length) {
      console.log(rejectedLinks[0].pageUrl, "page:", rejectedLinks[0].i, "products:", linksList.length, "rejected link")
	  writeProuctsLinks(linksList)
      rejectedLinks.shift()
      pagesProductsLinks.push(...linksList)
      delay = productIteratationDelay
    } else {
      delay += delayUpper
	  if(delay > maxDelay) delay = maxDelay
    }
  }
  await browser.close();
  return pagesProductsLinks
}

async function retryFetchRejectedProducts () {
	if(!rejectedProducts.length) return
	console.log("fetch rejected products links start")
	while(rejectedProducts.length) {
		let delay = productIteratationDelay
		for (productLink of rejectedProducts) {
			await fetchProductsDataOnPage(rejectedProducts[0], delay);
			rejectedProducts.pop()
		}
		delay += delayUpper
		if(delay > maxDelay) delay = maxDelay
	}
}
function closeStreams() {
	closeProductsListStream()
	closeStream()
	console.log("closed")
}

const productsLinksList = await getProductsLinksList(sellerUrl)
console.log("Products list count:", productsLinksList.length)

const parityLinks = Math.ceil(productsLinksList.length/threads)
const threadsPromises = []
for (let i = 0; i < threads; i++){
	await new Promise ((resolve)=>{
		setTimeout(()=>{
			resolve()
		},3000)
	})
	let parity = (i+1)%2
	let productsList = productsLinksList.splice(0,parityLinks)
	threadsPromises[i] = fetchProductsDataOnPage(productsList, parity ? proxyList : false);
}
await Promise.all(threadsPromises)
console.log("Rejected product urls count:", rejectedProducts.length)
retryFetchRejectedProducts()
closeStreams()
console.log("Finished")