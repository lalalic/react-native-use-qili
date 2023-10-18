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
const HelperName=`${helper}-console`


//fake
const {chrome, window}=(()=>{
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
                const services=value
                if(require.main){
                    console.info(`Remove facked service: chatgpt, bingAI`)
                    delete services.chatgpt
                    delete services.bingAI
                }

                if(process.env.chatgptToken && services.chatgpt){
                    services.chatgpt.getToken=()=>process.env.chatgptToken
                    services.chatgpt.read=async function(stream){
                        for await (let value of stream){
                            const raw=new TextDecoder().decode(value).split("data:").filter(a=>!!a)
                            for(let i=raw.length-1; i>-1; i--){
                                try{
                                    const piece=JSON.parse(raw[i])
                                    if(piece.message.author.role=="assistant"){
                                        if(piece.message.status=="finished_successfully"){
                                            return {
                                                message:piece.message.content.parts.join(""), 
                                                messageId:piece.message.id, 
                                                conversationId:piece.conversation_id,
                                                error: piece.error||undefined
                                            }
                                        }
                                        break
                                    }
                                }catch(e){

                                }
                            }
                        }
                    }
                }
                if(process.env.bingAICookie && services.bingAI){
                    services.bingAI.getCookie=()=>process.env.bingAICookie
                }
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
    const http = require('http');

    http.createServer((req, res) => {
        res.end(`Hello, ${helper}: ${JSON.stringify(chrome.storage.sync)}`);
    }).listen(3001); // Keep the server running to listen for incoming requests
}

subscriptAsHelper({helper:HelperName, chrome, window, Qili})

module.exports={chrome:chrome.storage.sync, Qili}