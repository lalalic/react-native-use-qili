import React from 'react';
import { View, TextInput, Button } from "react-native";
import { useDispatch } from "react-redux";
import { Qili } from "../store";
import FlyMessage from "./FlyMessage";


export default Object.assign(function Login({ }) {
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
        } catch (e) {
            FlyMessage.error(e.message);
        }
    }, []);

    const textStyle = { height: 40, fontSize: 20, borderWidth: 1, borderColor: "gray", padding: 4 };

    return (
        <View style={{ backgroundColor: "white", padding: 10, width: "100%" }}>
            <View style={{ flexDirection: "row", height: 40 }}>
                <TextInput style={{ flex: 1, ...textStyle }}
                    editable={!tick}
                    value={contact}
                    placeholder="Phone Number"
                    onChangeText={text => setContact(text)} />
                <Button style={{ width: 500 }}
                    disabled={!!tick}
                    onPress={e => requestCode(contact)}
                    title={tick ? tick + "" : (tick === 0 ? "Re-Request" : "Request Code")} />
            </View>

            <TextInput value={code} style={{ ...textStyle, marginTop: 20, marginBottom: 20 }}
                editable={!!authReady}
                placeholder="Verification Code"
                onChangeText={text => setCode(text)} />

            <View style={{ flexDirection: "row", height: 50, width: "100%" }}>
                <View style={{ flex: 1 }}>
                    <Button title="Cancel"
                        onPress={e => dispatch({ type: "my", payload: { requireLogin: false } })} />
                </View>
                <View style={{ flex: 1 }}>
                    <Button title="Login"
                        disabled={!authReady}
                        onPress={e => login({ contact, code })} />
                </View>
            </View>
        </View>
    );
}, {
    async updateToken(admin, dispatch) {
        const data = await Qili.fetch({
            id: "authentication_renewToken_Query",
        }, admin);

        if (data?.errors) {
            dispatch({ type: "my", payload: { admin: undefined, requireLogin: true } });
            return;
        }

        if (data?.me?.token) {
            dispatch({ type: "my", payload: { admin: { ...admin, headers: { ...admin.headers, "x-session-token": data.me.token } } } });
        }
    }
});
