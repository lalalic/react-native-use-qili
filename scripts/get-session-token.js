#!/usr/bin/env node

const prompts = require("prompts")
const fetch = require("node-fetch2")

;(async ()=>{
    const [
            ,
            ,apiKey=(await prompts({name:"apiKey",type:"text",message:"apiKey"})).apiKey
            ,contact=(await prompts({name:"contact",type:"text",message:"account contact"})).contact
            ,api=(await prompts({name:"api",type:"text",message:"api url", initial:"https://api.qili2.com/1/graphql"})).api
        ]=process.argv
    const options= request=>({
        method:"post",
        headers:{
            "content-type":"application/json",
            "x-application-id":apiKey,
        },
        body:JSON.stringify(request)
    })
    await fetch(api, options({
        id:"authentication_requestToken_Mutation",
        variables:{contact}
    }))
    const {code}=await prompts({name:"code",type:"text",message:`code in your ${contact}`})
    fetch(api, options({
        id:"authentication_login_Mutation",
        variables:{contact, token:code}
    })).then(async res=>{
        const {data:{login:{token}}}=await res.json()
        console.log(`token: ${token}`)
    })
})();