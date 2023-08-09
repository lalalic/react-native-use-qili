//create index.js
//require("../../scripts/chrome-extension-to-service.js")(require('path').resolve(__dirname, ".."))
function requireLocal(required, returns){
    return (new Function(`
        ${require('fs').readFileSync(require.resolve(required))};
        return ${returns}
    `))()
}
const {EventEmitter}=require("events")

//make env
const fetch= require('node-fetch2')
const {helper, accessToken, OPENAI_API_KEY, api, apiKey, DefaultChatService}=requireLocal("../env.js", "{helper, accessToken, OPENAI_API_KEY, api, apiKey, DefaultChatService}")
Object.assign(globalThis,{helper, accessToken, OPENAI_API_KEY, api, apiKey,fetch, DefaultChatService, WebSocket:require('ws')})
globalThis.SubscriptionsTransportWs= require("subscriptions-transport-ws")
globalThis.alert=(message)=>console.warn(message)
const HelperName=`${helper}-${process.env.helperSister||"sister"}`


//fake
const {chrome, window}=(()=>{
    let unsubscribe
    const empty=()=>({})
    const proxy=new Proxy({},{get:(_,key)=>empty})
    const chrome={
        tabs:proxy,
        browserAction:proxy,
        storage:{
            sync:Object.assign(new EventEmitter(), {
                get(key, callback){
                    callback?.(this[key])
                },
                set(value){
                    Object.assign(this, value)
                    this.emit('change', this)
                }
            })
        },
        runtime:{
            onMessage:proxy,
            onStartup:proxy,
            onInstalled:proxy,
            onSuspend:{
                addListener(unsub){
                    unsubscribe=unsub
                }
            }
        }
    }

    const window=new Proxy(globalThis, {
        get(target, key, ){
            if(key=="isLocal")
                return true
            return target[key]
        },
        set(target, key, value){
            if(key=="bros"){
                (async()=>{
                    const services=value
                    try{
                        const token=await services.chatgpt?.getToken()
                        if(!token){
                            delete services.chatgpt
                        }
                    }catch(e){
                        delete services.chatgpt
                    }

                    try{
                        const cookie=await services.bingAI?.getCookie()
                        if(!cookie){
                            delete services.bingAI
                        }
                    }catch(e){
                        delete services.bingAI
                    }
                })();
            }
            target[key]=value
        }
    })
    
    return {chrome, window}
})();

//load
const {subscriptAsHelper} = require("../index.js")

const Qili=requireLocal("../qili.js", "Qili")

if(require.main){
    process.argv.push("--chatgpt=false")
    process.argv.push("--bingAI=false")

    const http = require('http');

    http.createServer((req, res) => {
        res.end(`Hello, ${helper}: ${JSON.stringify(chrome.storage.sync)}`);
    }).listen(3001); // Keep the server running to listen for incoming requests
}

subscriptAsHelper({helper:HelperName, chrome, window, Qili})

module.exports={data:chrome.storage.sync}