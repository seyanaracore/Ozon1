import { get } from "http";
import { Worker } from "worker_threads"

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    })
  })
}
let currentdate = new Date();
let getTime = () => {
    return "Time: " +  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
}

async function run() {
  const a = runService({array: ["test1","test2","test3"], timer: 60 * 2}).then((r)=>console.log("Promise 1, started: " + getTime(),r))
  const b = runService({array: ["test4","test5","test6"], timer: 60 * 4}).then((r)=>console.log("Promise 2, started: " + getTime(),r))
  const c = runService({array: ["test7","test8","test9"], timer: 60 * 1}).then((r)=>console.log("Promise 3, started: " + getTime(),r))

//   Promise.all([a, b, c]).then(
//     (r) => {
//       console.log(r);
//     }
//   );
}

run().catch(err => console.error(err))