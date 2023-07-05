import React from 'react';
import { useSelector, useDispatch } from "react-redux";
import { Qili, hasChatGPTAccount } from "../store";
import { useChatGpt } from 'react-native-chatgpt';

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

        const { message, ...newSession } = await sendMessage(prompt, session, id, timeout);

        if (id && Object.keys(newSession).length > 0 && (!session
            || session.conversationId != newSession.conversationId
            || session.messageId != newSession.messageId)) {
            dispatch({ type: "my/session", payload: { [id]: newSession } });
        }
        return message;
    }, [sendMessage]);

    if (status == "logged-out") {
        dispatch({ type: "my", sessions: {} });
        login?.();
    }

    return ask;
}

function useChat() {
    const enableChatGPT = useSelector(state => hasChatGPTAccount(state));
    if (enableChatGPT){
        const {sendMessage, ...status}=useChatGpt()
        return {
            ...status,
            sendMessage:React.useCallback((ask)=>{
                if(ask.onAccumulatedResponse){
                    return new Promise((resolve,reject)=>{
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
                }else{
                    return sendMessage(...arguments)
                }
            },[])
        }
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
                const message=await Qili.askThenWaitAnswer(request, timeout)
                return processData(message)
            }catch(error){
                onError(error)
            }
        }
    }),[])
}
