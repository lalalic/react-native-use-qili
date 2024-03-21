import React from "react"
import {Switch, Platform} from "react-native"

export default function MySwitch({style, ...props}){
    const scale=React.useMemo(()=>Platform.select({
        ios:0.6,
        android:1,
        web:1,
    }))
    return <Switch style={[{ transform: [{ scale }] },style]} {...props}/>
}