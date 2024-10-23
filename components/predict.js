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
    const {api, apiServer=api.substring(0, api.indexOf("/",api.indexOf("//")+2))}=globalThis.QiliConf

    return new Promise(resolve=>{
        const socket=client(apiServer, {
            path:"/1/websocket/socket.io", 
            query:{
                ...getSession()
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
        })

        ["apiMessage", "userMessage", "conversation/summary/update", "VectorStore/addVectors", "VectorStore/similaritySearchVectorWithScore", "feedback", "echo"].forEach(event=>{
            socket.on(event, function(){
                listener.emit(event, ...arguments)
            })
        })
    })
}