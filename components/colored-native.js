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

export function Button({onPress, disabled, color, ...props}){
    const [running, setRunning]=React.useState(false)
    if(running)
        return <Loading size="small"/>
    return (
        <Native.Button {...props} disabled={disabled}
            onPress={e=>{
                (async()=>{
                    try{
                        setRunning(true)
                        await onPress(e)
                    }catch(e){
                        FlyMessage.error(e.message)
                    }finally{
                        setRunning(false)
                    }
                })();
            }} 
            />
    )
}

