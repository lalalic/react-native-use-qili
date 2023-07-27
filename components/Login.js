import React from 'react';
import { View, TextInput, Button } from "react-native";
import { useDispatch, useStore } from "react-redux";
import { isUserLogin, Qili } from "../store";
import FlyMessage from "./FlyMessage";
import Loading from "./Loading"

export default function Login({onLogin, l10n=new Proxy({},{get:(_, key)=>key})}) {
    const dispatch = useDispatch();
    const [contact, setContact] = React.useState("");
    const [authReady, setAuthReady] = React.useState(false);
    const [code, setCode] = React.useState("");
    const [tick, setTick] = React.useState();

    const startTick = React.useCallback(() => {
        let i = 60, doTick;
        const timer = setInterval(doTick = () => {
            if (i == 0) {
                clearInterval(timer);
                setTick(0);
            }

            else
                setTick(i--);
        }, 1000);

        doTick();
    }, []);

    const requestCode = React.useCallback(async (contact) => {
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
        try {
            const data = await Qili.fetch({
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
                            "x-session-token": data.login.token,
                        }
                    },
                    requireLogin: false,
                }
            });
            onLogin?.()
        } catch (e) {
            FlyMessage.error(e.message);
        }
    }, []);

    const textStyle = { height: 40, fontSize: 20, borderWidth: 1, borderColor: "gray", padding: 4 };

    return (
        <View style={{ flex:1, backgroundColor: "white", padding: 10}}>
            <View style={{ flexDirection: "row", height: 40 }}>
                <View style={{flexGrow:1, marginRight:10}}>
                    <TextInput style={textStyle}
                        editable={!tick}
                        value={contact}
                        placeholder={l10n["Phone Number"]}
                        placeholderTextColor="gray"
                        onChangeText={text => setContact(text)} />
                </View>
                <View style={{ width: 150, justifyContent:"center" }}>
                    <Button
                        disabled={!!tick}
                        onPress={e => requestCode(contact)}
                        title={tick ? tick + "" : (tick === 0 ? l10n["Re-Request"] : l10n["Request Code"])} />
                </View>
            </View>

            <TextInput value={code} style={{ ...textStyle, marginTop: 20, marginBottom: 20 }}
                editable={!!authReady}
                placeholder={l10n["Verification Code"]}
                placeholderTextColor="gray"
                onChangeText={text => setCode(text)} />

            <View style={{ flex:1, flexDirection: "row", height: 50 }}>
                <View style={{ flex: 1, alignItems:"center" }}>
                    <Button title={l10n["Cancel"]}
                        onPress={e => dispatch({ type: "my", payload: { requireLogin: false } })} />
                </View>
                <View style={{ flex: 1, alignItems:"center" }}>
                    <Button title={l10n["Login"]}
                        disabled={!authReady}
                        onPress={e => login({ contact, code })} />
                </View>
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
    },[])
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
