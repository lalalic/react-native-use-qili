import React from 'react';
import { Switch } from 'react-native';
import { useSelector, useDispatch} from "react-redux";
import { useLocation } from "react-router-native"

import { hasChatGPTAccount } from "../store";
import { ChatGptProvider } from './chatgpt-provider';
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

export function SwitchChatGPT(){
    const dispatch=useDispatch()
    const {widgets}=useSelector(state=>state.my)
    const {pathname}=useLocation()
    return (
        <Switch value={widgets.chatgpt} style={{transform:[{scale:0.5}], alignSelf:"center"}}
            onValueChange={e=>{
                dispatch({type:"my", payload:{sessions:{},widgets:{...widgets, chatgpt:!widgets.chatgpt}}})
                globalThis.lastPathName=pathname
            }}
            />
    )
}

