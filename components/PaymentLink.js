import React from "react"
import { WebView } from "react-native-webview"
import { Qili } from "react-native-use-qili/store"
import Loading from "react-native-use-qili/components/Loading"
export default function PaymentLink({link:$link, ...props}){
    const [link, setLink]=React.useState($link)
    React.useEffect(()=>{
        if($link)
            return 
        Qili.fetch({
            query:`query{paymentLink}`,
        }).then(({paymentLink})=>{
            setLink(paymentLink)
        })
    },[$link])

    if(!info){
        return <Loading/>
    }
    
    return ( <WebView {...props} source={{uri:link}}/> )
}
