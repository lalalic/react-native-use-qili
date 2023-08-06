//create index.js
//require("../../scripts/chrome-extension-to-service.js")(require('path').resolve(__dirname, ".."))
function requireLocal(required, returns){
    return eval(`
        ${require('fs').readFileSync(require.resolve(required))};
        (${returns})
    `)
}
const {EventEmitter}=require("events")

//make env
const fetch= require('node-fetch2')
const {helper, accessToken, OPENAI_API_KEY, api, apiKey}=requireLocal("../env.js", "{helper, accessToken, OPENAI_API_KEY, api, apiKey}")
Object.assign(globalThis,{helper, accessToken, OPENAI_API_KEY, api, apiKey,fetch, WebSocket:require('ws')})
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
                value.chatgpt.available=()=>true
                value.chatgpt.getToken=()=>""
                value.chatgpt._getLocalResponse=async function(question){
                    throw new Error(`helper[${HelperName}] not supported ChatGPT`)
                }

                value.bingAI.getCookie=async ()=>{
                    return await globalThis.getBingAICookie()
                }

                value.chatgpt.multithread=false//BingAI -> OpenAI
            }
            target[key]=value
        }
    })
    
    return {chrome, window}
})();

//load
const {subscriptAsHelper} = require("../index.js")

const Qili=requireLocal("../qili.js", "Qili")
subscriptAsHelper({helper:HelperName, chrome, window, Qili})
window.bros.chatgpt.test("hello")

if(require.main){
    const http = require('http');

    http.createServer((req, res) => {
    res.end(`Hello, ${helper}: ${JSON.stringify(chrome.storage.sync)}`);
    }).listen(3001); // Keep the server running to listen for incoming requests
}

module.exports={data:chrome.storage.sync}