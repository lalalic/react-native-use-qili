import React from "react"
import { NativeRouter, Route, Routes} from "react-router-native"
import Navigator from "react-native-use-qili/components/Navigator"
import WithBackButton from "react-native-use-qili/components/WithBackButton"

export default function Router({initialEntries, navs, children}){
    const {nav, noNav, nonRoute}=React.useMemo(()=>React.Children.toArray(children).reduce((all, a)=>{
        if(a?.type!==Route){
            all.nonRoute.push(a)
        }else if(a?.props?.path?.startsWith("/")){
            all.noNav.push(a)
        }else{
            all.nav.push(a)
        }
        return all
    },{nav:[], noNav:[], nonRoute:[]}),[children])
    return (
        <NativeRouter initialEntries={initialEntries}>
            <Routes>
                <Route path="/" element={<Navigator navs={navs}/>}>
                    {nav}
                </Route>
                {noNav}
                <Route element={React.createElement(()=><WithBackButton><Text>{l10n["oops!"]}</Text></WithBackButton>)}/>
            </Routes>
            {nonRoute}
        </NativeRouter>
    )
}