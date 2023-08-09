import React from 'react';
import { useSelector } from "react-redux";
import { hasChatGPTAccount } from "../store";
import { ChatGptProvider } from 'react-native-chatgpt';
import SubscribeHelpQueue from './SubscribeHelpQueue';
import { BingProvider } from './bing';

export default function ChatProvider({ children, services , debug,  api="chatgpt"}) {
    const enableChatGPT = useSelector(state => hasChatGPTAccount(state));
    const [content, realApi]=React.useMemo(()=>{
        if (enableChatGPT && api=="chatgpt") {
            return [(
                <ChatGptProvider>
                    {children}
                    {services && <SubscribeHelpQueue services={services}/>}
                </ChatGptProvider>
            ), api]
        }
    
        if(api=="bing"){
            return [(
                <BingProvider debug={debug}>
                    {children}
                </BingProvider>
            ), api]
        }
    
        return [children,]
    },[children, services, api, enableChatGPT])

    return (
        <ChatContext.Provider value={{api:realApi}}>
            {content}
        </ChatContext.Provider>
    )
}

export const ChatContext=React.createContext({})

