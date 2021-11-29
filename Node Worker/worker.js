import { workerData, parentPort } from "worker_threads";
let newArray = [];

let getTime = () => {
    let currentdate = new Date();
    return "Time: " +  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
}

const handleArray = async () =>
  new Promise((resolve) => {
    setTimeout(() => {
      newArray = workerData.array.map((element) => element + "_handled");
      resolve();
    }, workerData.timer * 1000);
  });
await handleArray();

parentPort.postMessage({ array: newArray, finished: getTime() });
