import express from "express"; 
const app = express();


app.get("/",(req,res)=>{
    res.send("Hello World!");
});

app.listen(5001,(req,res)=>{
    console.log("app is running on port 5001....")
});