import * as fs from "fs"
const defaultPath = "./out/"
const sellerName = "shopotam-119664"

let dir = defaultPath + sellerName;

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}
let filesData = []

const filesList = fs.readdirSync(dir + "/", { withFileTypes: true })

const readFiles = () => {
	filesList.forEach((file)=> {
		let fileData = fs.readFileSync(dir + "/" + file.name, {encoding: "utf8"})
		let codes = fileData.split("/id/").forEach((str, idx) => {
			let code = str.split(",")[0]
			if (code !== "sep=") filesData.push(code)
		})
	})
}
readFiles()
console.log(filesData, filesData.length)
filesData.forEach(data=>console.log(data))