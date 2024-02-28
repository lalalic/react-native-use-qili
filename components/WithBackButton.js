
import React from "react"
import { View } from "react-native"
import { Outlet, useNavigate} from "react-router-native"
import PressableIcon from "./PressableIcon"

export default function WithBackButton({icon="keyboard-arrow-left",size=32, color="white", left=10, right,opacity=0.7, backgroundColor="gray"}){
    const navigate=useNavigate()
    return (
        <View style={{flex:1}}>
            <Outlet/>
            <PressableIcon to={-1} 
                {...{name:icon, size, color}}
                style={{position:"absolute",left, right, backgroundColor, borderRadius:50, opacity}}
                onPress={e=>navigate(-1)}
                onLongPress={e=>navigate("/home",{replace:true})}
                >
            </PressableIcon>
        </View>
    )
}