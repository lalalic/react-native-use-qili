import React from "react"
import WebView from "./provider-web"
import {getSession} from "../store"

const Context=React.createContext({})
export default function PaymentLink({paylink, urlForPaylink,...props}){
    const [uri, setURI]=React.useState(paylink)
    React.useEffect(()=>{
        if(!!paylink)
            return 
        if(urlForPaylink){
            fetch(urlForPaylink,{headers:getSession()})
                .then(res=>res.text())
                .then(link=>setURI(link))
        }
    },[])
    if(!uri)
        return null
    return (
        <WebView 
            uri={uri}
            broName="payBro"
            Context={Context}
            closerStyle={{display:"none"}}
            bro={function injectBro(){
                return {
                    clean(){
                        const timer=setInterval(()=>{
                            const fields=document.querySelector('.App-Global-Fields')
                            if(fields){
                                fields.style.display="none"
                                document.querySelector('.App-Overview header').style.display="none"
                                clearInterval(timer)
                            }
                        },500)
                    }
                }
            }}
            {...props}
            >
            <Stripe/>
        </WebView>
    )
}

function Stripe(){
    const stripe=React.useContext(Context)
    React.useEffect(()=>{
        if(!stripe)
            return 
        stripe.service
            .on('stripeBro.ready',()=>{
                stripe.service.clean()
                stripe.service.show()
            })
    },[stripe])
    return null
}