import React, { useContext } from "react"
import * as Native from "react-native"
import Loading from "./Loading"
import { ColorScheme } from "./default-style"

export function Text({style, ...props}){
    const {text}=useContext(ColorScheme)
    return <Native.Text style={[{color:text}, style]} {...props}/>
}

export function View({style, ...props}){
    const {backgroundColor}=useContext(ColorScheme)
    return <Native.View style={[{backgroundColor}, style]} {...props}/>
}

export function TextInput({style, ...props}){
    const {text}=useContext(ColorScheme)
    return <Native.TextInput style={[{color:text}, style]} {...props}/>
}

export const asyncComponentFactory=({name,size="small",loading=<Loading size={size}/>,onError=e=>FlyMessage.error(e.message), ...ons})=>{
    const SyncComp=Native[name]
    return props=>{
        const [running, setRunning]=React.useState(false)
        const asyncOn=React.useCallback(onPress=>(...args)=>{
            (async()=>{
                try{
                    setRunning(true)
                    await onPress(...args)
                }catch(e){
                    onError?.(e)
                }finally{
                    setRunning(false)
                }
            })();
        },[setRunning])

        const handlers=Object.keys(ons).reduce((handlers, on)=>{
            const handler=props[on]
            if(handler){
                handlers[on]=React.useCallback(asyncOn(handler),[handler])
            }
            return handlers
        },{})

        if(running)
            return loading
        return (<SyncComp {...props} {...handlers}/>)
    }
}

export const Button=asyncComponentFactory({name:"Button", onPress:true})
export const Pressable=asyncComponentFactory({name:"Pressable", onPress:true, onLongPress:true})
