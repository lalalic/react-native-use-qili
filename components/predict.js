import { Qili, getSession} from "../store"
import client from "socket.io-client"
 
export async function ask(message, chatflow, timeout=60*1000){
    if(typeof(message)=="string"){
        message={question:message}
    }

    if(typeof(chatflow)==="number"){
        timeout=chatflow
    }

    if(!chatflow){
        chatflow=globalThis.QiliConf.chatflow
    }

    if(message.runMonitorSocketListener){
        message.runMonitorSocket=await makeRunMoinitorSocket(message.runMonitorSocketListener)
        if(!message.events){
            message.events=Object.keys(message.runMonitorSocketListener).map(a=>a.replace(/_/g,"/"))
        }
        delete message.runMonitorSocketListener
    }

    const control=new AbortController()
    const timer=setTimeout(()=>control.abort(),timeout)
    try{
        const res=await fetch(`https://ai.qili2.com/api/v1/prediction/${chatflow}`,{
            signal: control.signal,
            method:"POST",
            headers:{
                "content-type":"application/json",
                ...getSession()
            },
            body:JSON.stringify(message)
        })
        if(!res.ok){
            control.abort()
            throw new Error(res.statusText)
        }
        const predict=await res.text()
        return predict
    }catch(e){
        return e.message
    }finally{
        clearTimeout(timer)
    }
}

export async function uploadDocument(knowledgeId, urls){
    const session=getSession()
    const result = await Qili.fetch({
        query: `mutation($metadata:JSON!){
            uploadDocument(metadata:$metadata)
        }`,
        variables: {
            metadata: {
                id:knowledgeId,
                urls,
            }
        }
    },{...session,"x-application-id":"ai"})
    return result?.uploadDocument
}

export async function removeDocument(knowledgeId){
    const {me:user}=await Qili.fetch({query:"query{me{id}}"})
    const [,userId]=user.id.split(":")
    const session=getSession()
    const result = await Qili.fetch({
        query: `mutation($metadata:JSON!){
            removeDocument(metadata:$metadata)
        }`,
        variables: {
            metadata: {
                id: knowledgeId
            }
        }
    },{...session, "x-application-id":"ai"});
    return result?.removeDocument
}

async function makeRunMoinitorSocket(listener){
    const {apiKey, api, apiServer=api.substring(0, api.indexOf("/",api.indexOf("//")+2))}=globalThis.QiliConf
    listener=listener.emit && listener || new MonitorSocketListener(listener)
    return new Promise(resolve=>{
        const socket=client(apiServer, {
            path:"/1/websocket/socket.io", 
            query:{
                ...getSession(),
                "x-application-id": apiKey
            }
        })

        function done(){
            socket.disconnect()
            listener.emit("done")
        }

        socket.on('done',done)

        socket.on('connect_error', done)

        socket.on('connect', () => {
            resolve(socket.id)
        });

        socket.onAny(function(event, ...args){
            listener.emit(event, ...args)
        });
    })
}

export class MonitorSocketListener {
    constructor(listener){
        Object.assign(this, listener)
    }

    emit(event, ...args) {
        event=event.replace(/\//g, "_")
        this[event]?.(...args)
    }

    monitor(data) {
        //store.dispatch({ type: "monitor/run", data });
    }

    cost(data) {
        //store.dispatch({ type: "monitor/cost", data });
    }

    apiMessage(content) {
        //chatmessageApi.createNewChatmessage(chatflowId, { type: 'apiMessage', ...content });
    }

    userMessage(content) {
        //chatmessageApi.createNewChatmessage(chatflowId, { type: 'userMessage', ...content });
    }

    VectorStore_addVectors({ indexName, vectors }) {
        //VectorStores[indexName].addVectors(vectors);
    }

    async VectorStore_similaritySearchVectorWithScore({ indexName, args: { query, k } }, callback) {
        // const result = await VectorStores[indexName].similaritySearchVectorWithScore(query, k);
        // callback(result);
    }

    async feedback(message, callback) {
        callback("Y");
    }

    async echo(data, callback) {
        callback(data);
    }

    async conversation_summary_update(summary) {
        //store.dispatch({ type: "chatmessage/summary", id: chatflowId, ...summary });
    }
}
