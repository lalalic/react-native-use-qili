import React from "react"
import { SafeAreaView, LogBox} from "react-native"
import { StatusBar } from "expo-status-bar"
import * as ExpoSplashScreen from 'expo-splash-screen'
import { Provider }  from "./store"
import setDefaultStyle, {ColorScheme} from "./components/default-style"

LogBox.ignoreAllLogs()
ExpoSplashScreen.preventAutoHideAsync()

export default function App({children, reducers, storage, colorScheme:scheme="black"}){
    const [style, setStyle]=React.useState({})
    const [dataReady, setDataReady]=React.useState(false)

    React.useEffect(()=>{
        const color=scheme=="light" ? "black" : "white"
        const backgroundColor=scheme=="light" ? "white" : "black"
        const active=scheme=="light" ? "black" : "white"
        const primary=scheme=="light" ? "blue" : "yellow"
        const inactive="gray"
        
        setDefaultStyle({
            Text:{color},
            MaterialIcons:{
                color:inactive,
                size:24
            },
            ActivityIndicator:{
                color,
            }
        })
        setStyle({text:color,backgroundColor,active, inactive, primary, warn:"red"})
    },[scheme])

    const content=React.useMemo(()=>{
        if(dataReady){
            const containerStyle={flex:1, backgroundColor:style.backgroundColor}
            return (
                <SafeAreaView onLayout={e=>ExpoSplashScreen.hideAsync()} style={containerStyle}>
                    <ColorScheme.Provider key={scheme} value={style}>
                        {children}
                    </ColorScheme.Provider>
                </SafeAreaView>
            )
        }
        return null
    },[dataReady, scheme])

    return  (
        <Provider onReady={e=>setDataReady(true)} {...{storage, reducers}}>
            {content}
            <StatusBar style="light"/>
        </Provider>
    )
}
