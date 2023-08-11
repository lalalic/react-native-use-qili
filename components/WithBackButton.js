
import React from "react"
import { View } from "react-native"
import { Link, Outlet} from "react-router-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

export default function WithBackButton({icon="keyboard-arrow-left",size=32, color="white", left=10, right,opacity=0.7, backgroundColor="gray"}){
    return (
        <View style={{flex:1}}>
            <Outlet/>
            <Link to={-1} style={{position:"absolute",left, right, backgroundColor, borderRadius:50, opacity}}>
                <MaterialIcons {...{name:icon, size, color}}/>
            </Link>
        </View>
    )
}