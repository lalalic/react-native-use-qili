#!/usr/bin/env node

const prompts = require("prompts")
const fetch = require("node-fetch2")

;(async ()=>{
    const [
            ,
            ,apiKey=(await prompts({name:"apiKey",type:"text",message:"apiKey"})).apiKey
            ,type=(await prompts({name:"type",type:"text",message:"access token type"})).type
            ,name=(await prompts({name:"name",type:"text",message:"access token name"})).name
            ,sessionToken=(await prompts({name:"sessionToken",type:"text",message:"session token"})).sessionToken
            ,api=(await prompts({name:"api",type:"text",message:"api url", initial:"https://api.qili2.com/1/graphql"})).api
        ]=process.argv
    const options= request=>({
        method:"post",
        headers:{
            "content-type":"application/json",
            "x-application-id":apiKey,
            "x-session-token":sessionToken,
        },
        body:JSON.stringify(request)
    })
    fetch(api, options({
        query:`mutation($type:String, $name:String!){
            generateAccessToken(type:$type, name:$name)
        }`,
        variables:{type, name}
    })).then(async res=>{
        const {data:{generateAccessToken:token}}=await res.json()
        console.log(`${token}`)
    })
})();