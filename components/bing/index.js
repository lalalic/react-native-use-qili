import React from "react"
import ProvideWeb from "../provider-web"
import BingAIBro from "./bro"

export const BingContext=React.createContext({})
export function BingProvider(props){
    return (
        <ProvideWeb
            uri="https://www.bing.com/search?q=Bing+AI&showconv=1"
            userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 Edg/112.0.1700.00"
            headers={{"sec-ch-ua":'"Chromium";v="112", "Microsoft Edge";v="112", "Not:A-Brand";v="99"'}}
            Context={BingContext}
            bro={BingAIBro}
            broName="bingBro"
            injectedJavaScript={`
                const BingChat=globalThis.bingBro
                globalThis.bingBro=new BingChat({cookie:document.cookie})
                true;
            `}
            {...props}
            />
        
    )
}

export function useBing(){
    return React.useContext(BingContext)
}

