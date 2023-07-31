import React from "react"
import { NativeRouter, Route, Routes} from "react-router-native"
import Navigator from "react-native-use-qili/components/Navigator"
import WithBackButton from "react-native-use-qili/components/WithBackButton"

export default function Router({initialEntries, navs}){
    return (
        <NativeRouter initialEntries={initialEntries}>
            <Routes>
                <Route path="/" element={
                    <Navigator navs={navs}/>}>
                    {children}
                </Route>
                <Route element={React.createElement(()=><WithBackButton><Text>{l10n["oops!"]}</Text></WithBackButton>)}/>
            </Routes>
        </NativeRouter>
    )
}