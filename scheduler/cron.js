const cron=require("node-cron")

const {run}=require("../index")

cron.schedule("0 10 * * *",()=>{

console.log("10点更新")

run()

})

cron.schedule("0 17 * * *",()=>{

console.log("17点更新")

run()

})