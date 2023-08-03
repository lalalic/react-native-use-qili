import React from 'react';
import { View, } from "react-native";
import { useDispatch, useSelector, useStore } from "react-redux";
import { isUserLogin, Qili } from "../store";
import { TextInput, Text, Button } from "./colored-native"
import FlyMessage from "./FlyMessage";
import Loading from "./Loading"

export default function Login({onLogin,style, l10n=new Proxy({},{get:(_, key)=>key})}) {
    const dispatch = useDispatch();
    const [contact, setContact] = React.useState("");
    const [authReady, setAuthReady] = React.useState(false);
    const [code, setCode] = React.useState("");
    const [tick, setTick] = React.useState();

    const stopTick=React.useRef(null)
    const startTick = React.useCallback(() => {
        let i = 60, doTick;
        const timer = setInterval(doTick = () => {
            if (i == 0) {
                stopTick.current?.()
            }

            else
                setTick(i--);
        }, 1000);

        stopTick.current=()=>{
            clearInterval(timer);
            setTick(0);
            stopTick.current=null
        }

        doTick();
    }, []);

    const requestCode = React.useCallback(async (contact) => {
        if(!contact)
            return 
        try {
            const data = await Qili.fetch({
                id: "authentication_requestToken_Mutation",
                variables: { contact }
            });
            data.requestToken = true;
            setAuthReady(!!data.requestToken);
            if (!!data.requestToken) {
                startTick();
            }
        } catch (e) {
            FlyMessage.error(e.message);
        }
    }, []);

    const login = React.useCallback(async ({ contact, code }) => {
        if(!contact && !code){
            return 
        }
        try {
            const {login:{token}} = await Qili.fetch({
                id: "authentication_login_Mutation",
                variables: {
                    contact,
                    token: code,
                    name: "admin"
                }
            });

            dispatch({
                type: "my",
                payload: {
                    admin: {
                        contact,
                        headers: {
                            "x-session-token": token,
                        }
                    },
                    requireLogin: false,
                }
            });
            await onLogin?.()
        } catch (e) {
            setCode("")
            setAuthReady(false)
            stopTick.current?.()
            FlyMessage.error(e.message);
        }
    }, []);

    const textStyle = { height: 40, fontSize: 14, borderWidth: 1, borderColor: "gray", padding: 4 };

    return (
        <View style={[{ flex:1, padding: 10, justifyContent:"center"},style]}>
            <View style={{marginBottom:40, justifyContent:"center", alignItems:"center"}}>
                <Text style={{fontSize:20}}>{l10n["Sign Up / Sign In"]}</Text>
            </View>
            <View style={{ flexDirection: "row", height: 40 }}>
                <View style={{flexGrow:1, marginRight:10}}>
                    <TextInput style={textStyle}
                        editable={!tick}
                        value={contact}
                        placeholder={l10n["Phone Number"]}
                        placeholderTextColor="gray"
                        onChangeText={text => setContact(text)} />
                </View>
                <View style={{ width: 120, justifyContent:"center" }}>
                    <Button
                        disabled={!!tick}
                        onPress={async e => await requestCode(contact)}
                        title={tick ? tick + "" : (tick === 0 ? l10n["Re-Request"] : l10n["Request Code"])} 
                        />
                </View>
            </View>

            <View style={{ flexDirection: "row", height: 40, marginTop:20 }}>
                <View style={{flexGrow:1, marginRight:10}}>
                    <TextInput value={code} style={textStyle}
                        editable={!!authReady}
                        placeholder={l10n["Verification Code"]}
                        placeholderTextColor="gray"
                        onChangeText={text => setCode(text)} />
                </View>

                <View style={{ width: 120, justifyContent:"center" }}>
                    <Button
                        disabled={!authReady}
                        onPress={async()=>await login({ contact, code })} 
                        title={l10n["Login"]}
                        />
                </View>
            </View>

            <View style={{ flexDirection: "row", height: 50, marginTop:20, justifyContent:"center" }}>
                <Button title={l10n["Cancel"]}
                    onPress={e => dispatch({ type: "my", payload: { requireLogin: false } })} />
            </View>
        </View>
    );
}

Login.updateToken=async function updateToken(admin, dispatch) {
    try{
        const data = await Qili.fetch({
            id: "authentication_renewToken_Query",
        }, admin.headers);

        if (data?.me?.token) {
            dispatch({ type: "my", payload: { admin: { ...admin, headers: { ...admin.headers, "x-session-token": data.me.token } } } });
            return true
        }

        dispatch({ type: "my", payload: { admin: undefined, requireLogin: true } });
        return false
    }catch(e){
        dispatch({ type: "my", payload: { admin: undefined, requireLogin: true } });
        return false
    }
}

Login.Required=({children, onLogin, ...props})=>{
    const store=useStore()
    const hasSession=useSelector(state=>isUserLogin(state))
    const [logined, setLogined]=React.useState()
    React.useEffect(()=>{
        (async()=>{
            const state=store.getState()
            if(isUserLogin(state)){
                const done=await Login.updateToken(state.my.admin, store.dispatch)
                if(!!done){
                    await onLogin?.()
                }
                setLogined(!!done)
            }else{
                setLogined(false)
            }
        })();
    },[hasSession])
    
    if(logined===true){
        return children
    } else if(logined===false){
        return <Login {...props} 
            onLogin={async e=>{
                await onLogin?.()
                setLogined(true)
            }} />
    }

    return <Loading/>
}