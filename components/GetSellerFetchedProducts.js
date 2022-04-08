import * as fs from "fs";

const defaultPath = "../Out/";

const getSellerFetchedProducts = (sellerName, path = defaultPath) => {
   let filesData = [];
   const dir = path + sellerName + "/";
   const filesList = fs.readdirSync(dir, { withFileTypes: true });
   filesList.forEach((file) => {
      let fileData = fs.readFileSync(dir + "/" + file.name, {
         encoding: "utf8",
      });
      fileData.split("/id/").forEach((str) => {
         let code = str.split(",")[0];
         if (code !== "sep=") filesData.push(code);
      });
   });
   filesData = [...new Set(filesData)];
   console.log(
      "Seller already fetched products codes getted:",
      filesData.length,
      "\n"
   );
   return filesData;
};

export default getSellerFetchedProducts;
