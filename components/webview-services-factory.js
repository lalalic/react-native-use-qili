import React from "react"
import ProvideWeb from "./provider-web" 
import { Qili } from "../store"

export default function webviewServicesFactory(extension){
    const {uris, services, subscriptAsHelper, ...Bros}=extension
    const webviews=Object.entries(Bros).reduce((all, [id, bro])=>{
        const Context=React.createContext({})
        all[id]={
            Provider(props){
                return (
                    <ProvideWeb id={id}
                        Context={Context}
                        uri={uris[id]}
                        bro={bro}
                        {...props}
                        >
                    </ProvideWeb>
                    )
            },
            
            useService(){
                return React.useContext(Context)
            }
        }

        return all
    },{})

    const proxies=Object.entries(services).reduce((all, [id, bro])=>{
        const Context=React.createContext({})
        all[id]={
            Provider({banned, ...props}){
                const service=React.useMemo(()=>{
                    if(banned){
                        return new Proxy({},{
                            get(target, fnKey){
                                return (...args)=>{
                                    const message={fnKey, args, $service: id}
                                    console.debug(message)
                                    return Qili.askThenWaitAnswer(message)
                                }
                            }
                        })
                    }
                    return bro()
                },[banned])
                return ( <Context.Provider value={{service}} {...props}/>)
            },
            
            useService(){
                return React.useContext(Context)
            }
        }

        return all
    },{})


    return  {
        ...webviews, 
        ...proxies, 
        subscriptAsHelper
    }
}
