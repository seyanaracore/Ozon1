import Puppeteer from "puppeteer";
import UserAgent from "user-agents";
import settings from "./components/settings.js";
import FileStream from "./utils/WriteData.js";
import * as os from "os";
import getSellerFetchedProducts from "./utils/getSellerFetchedProducts.js";

async function fetchProductsLinks(
   url,
   delay = productIteratationDelay,
   browser
) {
   const page = await browser.newPage();
   await page.setUserAgent(UserAgent.toString());
   await page.setDefaultTimeout(pageTimeout * 1000);
   await page.waitForTimeout(delay * 1000);
   await page.goto(url, { waitUntil: "networkidle2" });
   let pageLinks = await page.evaluate(() => {
      const goods = document.querySelectorAll(".hp6 > div");
      const links = [];
      const errorBlock = document.querySelector(".q0q");
      const pageError =
         errorBlock?.textContent?.match("не нашлось") ||
         errorBlock?.textContent?.match("ошибка");
      const captcha = document
         .querySelector("#main-iframe")
         ?.contentWindow?.document?.querySelector(".error-content");
      if (pageError) {
         return null;
      }
      if (captcha) return links;
      for (let good of goods) {
         const link = good?.childNodes[0]?.href;
         links.push(link);
      }
      return links;
   });
   await page.close();
   return pageLinks;
}

async function fetchProductsDataOnPage(
   productsLinks,
   delay = productIteratationDelay,
   fileStream
) {
   const browser = await Puppeteer.launch({
      headless: true,
      defaultViewport: null,
   });
   const urls = checkProductsLinks(productsLinks);
   for (let i = 1; i <= urls.length; i++) {
      let url = urls[i - 1];
      if (
         fetchedData.some((productData) =>
            productData.codes.includes(url.split("/?")[0].split("-")[1])
         )
      ) {
         continue;
      }
      const getMin = () =>
         (Math.ceil(i / productsPerPageMax) - 1) * productsPerPageMax;
      const getMax = () =>
         getMin() +
         Math.min(
            productsCountPerPage || productsPerPageMax,
            productsPerPageMax
         );
      if (!(i > getMin() && i <= getMax())) {
         continue;
      }
      const page = await browser.newPage();
      await page.waitForTimeout((delay - 1) * 1000);
      await page.setUserAgent(UserAgent.toString());
      page.setDefaultTimeout(pageTimeout * 1000);
      await page.goto(url, { waitUntil: "networkidle2" });
      const productData = await page.evaluate(async () => {
         try {
            //Constants
            window.defaultImageSize = "/wc1200/";
            window.setImageSize = "/";
            window.delayIterateVarieties = 2;
            window.frequencyProductCodeCheck = 2;
            window.isPageErrorTimer = 5;

            //Selectors
            window.codeSelector = '[data-widget="webDetailSKU"]';
            window.imageSelector = '[data-widget="webGallery"] > div';
            window.productVarietiesSelector = ".ui-i4 > div > button.ui-f4";
            window.activeProudctVarietySelector = ".i3i .ii4.i4i";
            window.captchaSelectors = ["#main-iframe", ".error-content"];
            window.errorPageSelector = ".a3q7";

            //Getters
            window.getProductImageUrl = () => {
               return document.querySelector(imageSelector)
                  ?.childNodes[0]?.childNodes[0]?.childNodes[0]?.childNodes[0]?.src;
            };
            window.getProductCode = () => {
               return document
                  .querySelector(window.codeSelector)
                  ?.textContent.split(": ")[1];
            };
            window.getBrand = () => {
               const rowName = "Бренд в одежде и обуви";
               return (
                  [...document.querySelectorAll(".pi3")].find((el) => {
                     return el.textContent === rowName;
                  })?.parentElement?.parentElement?.childNodes[1]
                     ?.textContent || ""
               );
            };
            window.getName = () => {
               return document.querySelector(
                  '[data-widget="webProductHeading"]'
               ).childNodes[0].textContent;
            };

            //GlobalIterator
            window.iterator = 0;

            //Variables
            window.productData = {
               //Данные_______________________________________________________________________________
               codes: [],
               images: [],
               names: [],
               brands: [],
            };
            window.productCode = false;
            window.productVarieties = document.querySelectorAll(
               productVarietiesSelector
            );
            //Functions
            window.checkCaptcha = () => {
               if (
                  document
                     .querySelector(captchaSelectors[0])
                     ?.contentWindow?.document?.querySelector(
                        captchaSelectors[1]
                     )
               ) {
                  return true;
               } else {
                  return false;
               }
            };
            window.checkPageError = () => {
               if (
                  document
                     .querySelector(errorPageSelector)
                     ?.textContent?.match("не существует")
               ) {
                  return true;
               } else {
                  return false;
               }
            };

            window.fillProductData = async () =>
               new Promise((resolve) => {
                  let timer = setTimeout(
                     () => resolve(),
                     window.isPageErrorTimer * 1000
                  );
                  let interval = setInterval(() => {
                     const actualPageProductCode = window.getProductCode();
                     if (actualPageProductCode !== window.productCode) {
                        window.productCode = actualPageProductCode;
                        //Получение данных______________________________________________________________
                        let code = window.getProductCode();
                        let image = window.getProductImageUrl();
                        let name = window.getName();
                        let brand = window.getBrand();

                        if (window.setImageSize) {
                           image = image?.replace(
                              window.defaultImageSize,
                              window.setImageSize
                           );
                        }
                        //Заполнение данных_______________________________________________________________
                        window.productData.codes.push(code);
                        window.productData.images.push(image);
                        window.productData.brands.push(brand);
                        window.productData.names.push(name);
                        clearInterval(interval);
                        clearTimeout(timer);
                        resolve();
                     }
                  }, window.frequencyProductCodeCheck * 1000);
               });

            window.iterateProductVarieties = async () => {
               for (
                  ;
                  window.iterator <= window.productVarieties.length;
                  window.iterator += 1
               ) {
                  await new Promise((resolve) => {
                     setTimeout(
                        () => resolve(),
                        window.delayIterateVarieties * 1000
                     );
                  });
                  if (window.checkCaptcha()) {
                     window.productData = false;
                     break;
                  }
                  //waiting to avoid blocking
                  const varietiesInIterate = document.querySelectorAll(
                     window.productVarietiesSelector
                  );

                  window.productVarieties = varietiesInIterate;
                  //checking for a larger varieties list
                  await window.fillProductData();
                  productVarieties[window.iterator]?.click();
                  if (
                     window.iterator === 0 &&
                     window.productVarieties[
                        window.iterator
                     ]?.childNodes[0]?.childNodes[0]?.classList.contains(
                        window.activeProudctVarietySelector
                     )
                  ) {
                     productVarieties[window.iterator + 1]?.click();
                  }
               }
               if (!window.productVarieties.length) {
                  await window.fillProductData();
               }
            };
            if (window.checkCaptcha()) {
               window.productData = false;
               return window.productData;
            } else if (window.checkPageError()) {
               return window.productData;
            } else {
               await window.iterateProductVarieties();
            }
         } catch {
            window.productData = false;
         }
         return window.productData;
      });
      if (!productData) {
         rejectedProducts.push(url);
         delay += delayUpper;
         if (delay > maxDelay) delay = maxDelay;
         console.error(
            "product:",
            i,
            "current page:",
            Math.ceil(i / productsPerPageMax),
            url,
            "rejected"
         );
      } else {
         delay = productIteratationDelay;
         fetchedData.push(productData);
         console.log(
            "codes:",
            productData.codes.length,
            "images:",
            productData?.images.length,
            "product:",
            i,
            "of",
            urls.length,
            "current page:",
            Math.ceil(i / productsPerPageMax)
         );
         fileStream.writeData(productData);
      }
      page.close();
   }
   await browser.close();
   console.error(
      "\n" + "Rejected product urls count:",
      rejectedProducts.length
   );
   return fetchedData;
}

function checkProductsLinks(pageLinks) {
   const checkedProductsCodes = getSellerFetchedProducts(
      sellerName,
      productsDataParams.path
   );
   let checkedLinks = pageLinks.filter((productLink) => {
      let productCode = productLink
         .split("/?")[0]
         .slice("-9", productLink.length);
      return !checkedProductsCodes.includes(productCode);
   });
   console.log("New products for fetch:", checkedLinks.length, "\n");
   return checkedLinks;
}

async function getProductsLinksList(sellerUrl, fileStream) {
   const browser = await Puppeteer.launch({
      headless: true,
      defaultViewport: null,
   });
   let delay = productIteratationDelay;
   const pagesProductsLinks = [];
   const rejectedLinks = [];
   for (let i = initialIterationPage || 1; i < 999; i++) {
      if (
         pagesHandlingCount &&
         i === pagesHandlingCount + (initialIterationPage || 1)
      ) {
         break;
      }
      let pageUrl =
         sellerUrl.slice(0, sellerUrl.lastIndexOf("/")) +
         `/?page=${i}&sorting=${sortingTypes[sortBy]}`;
      let linksList;
      try {
         linksList = await fetchProductsLinks(pageUrl, delay, browser);
      } catch (err) {
         console.log(err);
         linksList = [];
      }
      if (!linksList) {
         break;
      }
      if (!linksList.length) {
         console.error("page:", i, "rejected");
         rejectedLinks.push({ pageUrl, i });
         delay += delayUpper;
         if (delay > maxDelay) delay = maxDelay;
      } else {
         console.log(pageUrl, "page:", i, "products:", linksList.length);
         fileStream.writeData(linksList);
         pagesProductsLinks.push(...linksList);
         delay = productIteratationDelay;
      }
   }
   console.log(
      "\nSuccesful products links fetched:",
      pagesProductsLinks.length
   );
   console.error("Rejected links:", rejectedLinks.length, "\n");
   while (rejectedLinks.length) {
      let pageUrl = rejectedLinks[0].pageUrl;
      let linksList;
      try {
         linksList = await fetchProductsLinks(pageUrl, delay, browser);
      } catch (err) {
         console.log(err);
         linksList = [];
      }
      if (!linksList) {
         break;
      }
      if (linksList.length) {
         console.error(
            rejectedLinks[0].pageUrl,
            "page:",
            rejectedLinks[0].i,
            "products:",
            linksList.length,
            "rejected link"
         );
         fileStream.writeData(linksList);
         rejectedLinks.shift();
         pagesProductsLinks.push(...linksList);
         delay = productIteratationDelay;
      } else {
         delay += delayUpper;
         if (delay > maxDelay) delay = maxDelay;
      }
   }
   await browser.close();
   const productsLinks = [...new Set(pagesProductsLinks)];
   console.log("Products list count:", productsLinks.length);
   return productsLinks;
}

async function retryFetchRejectedProducts(fileStream) {
   if (!rejectedProducts.length) return;
   console.log("\n" + "fetch rejected products links start" + "\n");
   while (rejectedProducts.length) {
      let delay = productIteratationDelay;
      await fetchProductsDataOnPage(rejectedProducts[0], delay, fileStream);
      rejectedProducts.shift();
      delay += delayUpper;
      if (delay > maxDelay) delay = maxDelay;
   }
}
function openStreams(sellerName) {
   const productsDataStream = new FileStream(
      sellerName,
      productsDataParams.path,
      productsDataParams.fileFormat,
      productsDataParams.dataHandler,
      productsDataParams.initialValue
   );
   const productsLinksStream = new FileStream(
      sellerName,
      productsLinksParams.path,
      productsLinksParams.fileFormat,
      productsLinksParams.dataHandler
   );
   return { productsDataStream, productsLinksStream };
}
function closeStreams(streams) {
   streams.forEach((stream) => stream.closeStream());
}

//______________________________________________________________________________
const {
   sellerUrl,
   productIteratationDelay,
   productsCountPerPage,
   pagesHandlingCount,
   initialIterationPage,
   maxDelay,
   productsPerPageMax,
   delayUpper,
   sortBy,
   pageTimeout,
   sortingTypes,
} = settings;
let parseSuccesful = false;
let productsLinksList = false;
const sellerName =
   settings.sellerUrl.split("seller/")[1]?.split("/")[0] || "OzonGlobal";
const fetchedData = [];
const rejectedProducts = [];
const productsDataParams = {
   path: "./out/",
   fileFormat: ".csv",
   initialValue: "sep=," + os.EOL + "Photos,Urls,Images,Name,Brand" + os.EOL,
   dataHandler: (product) => {
      let handledData = "";
      for (let i = 0; i < product.codes.length; i++) {
         handledData += `,https://www.ozon.ru/context/detail/id/${product.codes[i]},${product.images[i]}${os.EOL}`;
      }
      return handledData.length ? handledData : product;
   },
};
const productsLinksParams = {
   path: "./out/_links/",
   fileFormat: ".txt",
   dataHandler: (productLinks) => {
      let handledLinks = "";
      productLinks.forEach((link) => (handledLinks += link + os.EOL));
      return handledLinks;
   },
};
//_____________________________________________________________________________
const startParse = async () => {
   const { productsDataStream, productsLinksStream } = openStreams(sellerName);
   try {
      if (!productsLinksList) {
         productsLinksList = await getProductsLinksList(
            sellerUrl,
            productsLinksStream
         );
      }
      await fetchProductsDataOnPage(
         productsLinksList,
         productIteratationDelay,
         productsDataStream
      );
      await retryFetchRejectedProducts(productsDataStream);
      closeStreams([productsDataStream, productsLinksStream]);
      console.log("\n" + "Finished");
      parseSuccesful = true;
   } catch (err) {
      closeStreams([productsDataStream, productsLinksStream]);
      console.error(err);
   }
};
//________________________________
while (!parseSuccesful) {
   await startParse();
}
