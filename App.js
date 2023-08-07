import React from "react"
import { SafeAreaView, LogBox} from "react-native"
import { StatusBar } from "expo-status-bar"
import * as ExpoSplashScreen from 'expo-splash-screen'
import * as Updates from "expo-updates"
import { Provider, Qili }  from "./store"
import setDefaultStyle, {ColorScheme} from "./components/default-style"

LogBox.ignoreAllLogs()
ExpoSplashScreen.preventAutoHideAsync()

export default function App({ContainerView=SafeAreaView, children, colorScheme:scheme="light", onCrash, recreateWhenCrash, ...props}){
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
            <StatusBar style={scheme}/>
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

    crashReport(crash){
        this.props.onCrash?.(crash)
        const {error:{componentStack, isComponentError, message, stack}, runtimeVersion, updatedId, manifestCreatedAt}=crash
        try{
            Qili.fetch({
                query:`mutation($crash:JSON!){
                    crashReport(crash:$crash)
                }`,
                variables:{
                    crash:{componentStack, isComponentError, message, stack, runtimeVersion, updatedId, manifestCreatedAt}
                }
            })
        }catch(e){
            console.warn('System: mutation crashReport(crash:JSON!):Boolean should be implemented in cloud module')
        }finally{
            console.warn(crash.error)
        }
    }
    
    componentDidCatch(error, info){
        this.crashReport({
            error, 
            info, 
            runtimeVersion: Updates.runtimeVersion, 
            manifestCreatedAt: Updates.createdAt, 
            updatedId: Updates.updatedId
        })
    }

    render(){
        const {recreateWhenCrash=true, children}=this.props
        return recreateWhenCrash? React.cloneElement(children,{key:this.state.key}) : children
    }
}

