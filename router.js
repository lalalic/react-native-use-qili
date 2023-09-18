import React from "react"
import { NativeRouter, Route, Routes} from "react-router-native"
import Navigator from "react-native-use-qili/components/Navigator"
import WithBackButton from "react-native-use-qili/components/WithBackButton"

export default function Router({initialEntries, navs, children, root}){
    const {nav, noNav}=React.useMemo(()=>React.Children.toArray(children).reduce((all, a)=>{
        if(a?.props?.path?.startsWith("/")){
            all.noNav.push(a)
        }else{
            all.nav.push(a)
        }
        return all
    },{nav:[], noNav:[]}),[children])

    return (
        <NativeRouter initialEntries={initialEntries}>
            <Routes>
                <Route path="/" element={root||<Navigator navs={navs}/>}>
                    {nav}
                </Route>
                {noNav}
                <Route element={React.createElement(()=><WithBackButton><Text>{l10n["oops!"]}</Text></WithBackButton>)}/>
            </Routes>
        </NativeRouter>
    )
}