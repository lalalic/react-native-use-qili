import React from 'react';
import { useSelector, useDispatch } from "react-redux";
import { Qili, hasChatGPTAccount } from "../store";
import { useChatGpt } from 'react-native-chatgpt';
import { ChatContext } from './ChatProvider'
import { useBing } from './bing';

/**
 * local: use id to avoid massive session
 * remote: chat session should be kept
 * @returns
 */

export default function useAsk(xid = "random", defaultQuestion, timeout0 = 60000) {
    const { sendMessage, status, login } = useChat();

    const dispatch = useDispatch();
    const $sessions= React.useRef(null)
    $sessions.current=useSelector(state => state.my.sessions)

    const ask = React.useCallback(async (prompt = defaultQuestion, id = xid, timeout = timeout0) => {
        const session = $sessions.current[id];
        console.debug({ event: "ask", prompt, session, id });
        try{
            const { message, ...newSession } = await sendMessage(prompt, session, id, timeout);

            if(!message)
                throw new Error('No message returned')
                
            if (id && Object.keys(newSession).length > 0 && (!session
                || session.conversationId != newSession.conversationId
                || session.messageId != newSession.messageId)) {
                dispatch({ type: "my/session", payload: { [id]: newSession } });
            }

            return message;
        }catch(e){
            if(e.message=="Not Found" && session){
                const { message, ...newSession } = await sendMessage(prompt, null, id, timeout);

                if(!message)
                    throw new Error('No message returned')
                    
                if (id) {
                    dispatch({ type: "my/session", payload: { [id]: newSession } });
                }

                return message;
            }
        }
    }, [sendMessage]);

    if (status == "logged-out") {
        dispatch({ type: "my", sessions: {} });
        login?.();
    }

    return ask;
}


function useChat() {
    const {api}=React.useContext(ChatContext)

    if (api=="chatgpt"){
        const {sendMessage, ...status}=useChatGpt()
        return {
            ...status,
            sendMessage:React.useCallback(async function(ask){
                if(ask.onAccumulatedResponse){
                    return await new Promise((resolve,reject)=>{
                        sendMessage({
                            ...ask,
                            onAccumulatedResponse({isDone, ...response}){
                                ask.onAccumulatedResponse(...arguments)
                                if(isDone){
                                    resolve(response)
                                }
                            },
                            onError(error){
                                ask.onError?.(error)
                                reject(error)
                            }
                        })
                    })
                }
                
                return await sendMessage(...arguments)
                
            },[sendMessage])
        }
    }
    
    if(api=="bing"){
        const {service, status}=useBing()
        return React.useMemo(()=>{
            return {
                status,
                async sendMessage(message, session){
                    const options={...session, variant:"Precise"}
                    if(typeof(message)=="object"){
                        const {message:prompt, onAccumulatedResponse, onError}=message
                        try{
                            if(onAccumulatedResponse){
                                options.onProgress=({text, conversationId})=>{
                                    onAccumulatedResponse({message:text, conversationId, isDone:false})
                                }
                            }
                            
                            const {conversationId, text} = await service.sendMessage(prompt, options)
                            onAccumulatedResponse?.({message:text, conversationId, isDone:true})
                            return {message:text, conversationId}
                        }catch(e){
                            onError?.(e)
                        }
                    }
                    const {conversationId, text}=await service.sendMessage(message, options)
                    return {conversationId, message:text}
                }
            }
        },[service])
    }

    return React.useMemo(()=>({
        status: "authenticated", 
        sendMessage:async (message, options, id, timeout)=>{
            const [request, processData = a => a, onError = a => a] = (() => {
                if (id == "chat") { //no helper then no session
                    if (typeof (message) == "object") {
                        const { message: prompt, options: $options, onAccumulatedResponse, onError } = message;
                        return [
                            { message: prompt, options: { ...$options, ...options } },
                            data => {
                                onAccumulatedResponse?.({ ...data, isDone: true });
                                return { ...data };
                            },
                            onError
                        ];
                    } else {
                        return [
                            {
                                message,
                                options: options?.helper ? options : {} /* empty indicate remote proxy to return session*/
                            }
                        ];
                    }
                } else {
                    return [message.message || message];
                }
            })();
            console.debug({ event: "askThenWaitAnswer", message, options, id, timeout });
            try{
                const message=await Qili.bridge.askThenWaitAnswer(request, timeout)
                return processData(message)
            }catch(error){
                onError(error)
            }
        }
    }),[])
}
