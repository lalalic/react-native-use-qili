import React from "react"
import {Switch} from "react-native"

export default function MySwitch({style, ...props}){
    return <Switch style={[{ transform: [{ scale: 0.6 }] },style]} {...props}/>
}