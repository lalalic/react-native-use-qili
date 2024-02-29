import React from "react"
import { SafeAreaView, LogBox} from "react-native"
import { StatusBar } from "expo-status-bar"
import * as ExpoSplashScreen from 'expo-splash-screen'
import * as Updates from "expo-updates"
import { setJSExceptionHandler, setNativeExceptionHandler } from "react-native-exception-handler"
import { Provider, Qili }  from "./store"
import setDefaultStyle, {ColorScheme} from "./components/default-style"
import { FirstTimeTutorial } from "./components/Tutorial"

LogBox.ignoreAllLogs()
ExpoSplashScreen.preventAutoHideAsync()

export default function App({ContainerView=SafeAreaView, children, colorScheme:scheme="light", onCrash, recreateWhenCrash, tutorials, ...props}){
    const [style, setStyle]=React.useState({})
    const [dataReady, setDataReady]=React.useState(false)

    React.useEffect(()=>{
        const color=scheme=="light" ? "black" : "white"
        const backgroundColor=scheme=="light" ? "white" : "black"
        const active=scheme=="light" ? "black" : "white"
        const primary=scheme=="light" ? "blue" : "yellow"
        const inactive="#333333"        
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
                <CrashReport {...{recreateWhenCrash, onCrash}}>
                    <ContainerView onLayout={e=>ExpoSplashScreen.hideAsync()} style={containerStyle}>
                        <ColorScheme.Provider key={scheme} value={style}>
                            {children}
                        </ColorScheme.Provider>
                    </ContainerView>
                </CrashReport>
            )
        }
        return null
    },[dataReady, scheme, style])

    return  (
        <Provider onReady={e=>setDataReady(true)} {...props}>
            {content}
            <StatusBar style={scheme=="light" ? "dark" : "light"}/>
            {tutorials && <FirstTimeTutorial onDone={false} {...(Array.isArray(tutorials) ? {data:tutorials} : tutorials)}/>}
        </Provider>
    )
}

class CrashReport extends React.Component{
    constructor(){
        super(...arguments)
        this.state={key:Date.now()}
    }

    static getDerivedStateFromError(error){
        return {key:Date.now()}
    }
    
    componentDidCatch(error, info){
        this.props.onCrash?.({error})
        const {componentStack, isComponentError, message, stack}=error
        reportCrash({message, stack, componentStack, isComponentError})
    }

    render(){
        const {recreateWhenCrash=true, children}=this.props
        return recreateWhenCrash? React.cloneElement(children,{key:this.state.key}) : children
    }
}

setJSExceptionHandler(function(error, isFatal){
    reportCrash({
        message:error.message,
        stack: error.stack,
        isFatal
    })
})

setNativeExceptionHandler(function(errorMessage){
    reportCrash({
        message:errorMessage
    })
})

function reportCrash(crash){
    try{
        Qili.fetch({
            query:`mutation($crash:JSON!){
                crashReport(crash:$crash)
            }`,
            variables:{
                crash:{
                    isComponentError:false,
                    runtimeVersion: Updates.runtimeVersion, 
                    manifestCreatedAt: Updates.createdAt, 
                    updatedId: Updates.updatedId,
                    ...crash,
                }
            }
        })
    }finally{
        console.warn(crash)
    }
}



