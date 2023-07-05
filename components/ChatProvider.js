import React from 'react';
import { useSelector } from "react-redux";
import { hasChatGPTAccount } from "../store";
import { ChatGptProvider } from 'react-native-chatgpt';
import SubscribeHelpQueue from './SubscribeHelpQueue';

export default function ChatProvider({ children, services }) {
    const enableChatGPT = useSelector(state => hasChatGPTAccount(state));

    if (enableChatGPT) {
        return (
            <ChatGptProvider>
                {children}
                {services && <SubscribeHelpQueue services={services}/>}
            </ChatGptProvider>
        );
    }

    return children;
}
