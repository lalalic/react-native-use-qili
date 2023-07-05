import React from 'react';
import { useSelector } from "react-redux";
import { Qili } from '../store';
import usePersistAccessToken from "react-native-chatgpt/lib/commonjs/hooks/usePersistAccessToken"


export default function SubscribeHelpQueue({children, services}){
    const {accessToken}=usePersistAccessToken()
    const $chatgptAccessToken=React.createRef(accessToken)
    $chatgptAccessToken.current=accessToken

    const {helper}=useSelector(({ my:{uuid:helper},  })=>({helper}))

    React.useEffect(()=>{
        if(!services?.subscriptAsHelper){
            return 
        }
        const empty=()=>({})
        let unsubscribe
        const proxy=new Proxy({},{get:(_,key)=>empty})
        const chrome={
            tabs:proxy,
            browserAction:proxy,
            storage:{
                sync:{
                    get(type, callback){
                        callback?.(0)
                    },
                    set(){

                    }
                }
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

        const window={isLocal:true}
        services.subscriptAsHelper({helper,Qili, chrome, window})
        window.bros.chatgpt.getToken=()=>{
            return $chatgptAccessToken.current.split(" ")[1]
        }
        return ()=>{
            unsubscribe?.()
        }
    },[])

    return children
}


