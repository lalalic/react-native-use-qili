import React from "react"
import { Text, Pressable } from "react-native"
import { useNavigate } from "react-router-native"
import { Qili } from "react-native-use-qili/store"

export default function Balance(props){
    const navigate=useNavigate()
    const [balance, setBalance]=React.useState("")
    React.useEffect(()=>{
        Qili.fetch({query:`query{me{balance}}`})
            .then(data=>setBalance((data.me.balance/100000).toFixed(2)))
    },[])
    return (
        <Pressable onLongPress={e=>navigate("/account/paylink")}>
            <Text {...props}>{balance}</Text>
        </Pressable>
    )
}