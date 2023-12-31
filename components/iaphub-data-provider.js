import React from "react";
import Iaphub from "react-native-iaphub"
import { IaphubDataProvider } from 'react-native-iaphub-ui';
import iap from "react-native-iaphub-ui/src/i18n/en"
const l10n=globalThis.l10n

export default function MyIaphubDataProvider({products,onPurchase, ...props}) {
    Iaphub.products=products

    React.useMemo(()=>{
        Object.keys(iap).forEach(key=>{
            Object.keys(iap[key]).forEach(k=>{
                iap[key][k]=(fx=>(...args)=>l10n[fx(...args)])(iap[key][k])
            })
        })
        return true
    },[])

    React.useEffect(() =>{
        onPurchase && Iaphub.addEventListener('onPurchase', onPurchase)
        return () => Iaphub.end?.()
    },[]);
    return <IaphubDataProvider {...{ appId: "A", apiKey: "A", userId: "A", lang:l10n.getLanguage()}} {...props} />;
}

;(function({type:IntroPhase}){
    IntroPhase.prototype.getPhaseText=(_get=>function(){
        const {introPhase}=this.props
        if(introPhase.title)
            return introPhase.title
        return _get.call(this)
    })(IntroPhase.prototype.getPhaseText)
})(require("react-native-iaphub-ui/src/paywall/intro-phase").default({}));


;(function({type:Buy}){
    Buy.prototype.render=(_render=>function(){
        const {selectedProduct, selectedActiveProductIndex}=this.props
        if(!selectedProduct){
            return null
        }
        
        if(selectedActiveProductIndex==null && 
            selectedProduct.type=="renewable_subscription" && 
            selectedProduct.isActive){
            return null
        }
        return _render.call(this)
    })(Buy.prototype.render)
})(require("react-native-iaphub-ui/src/paywall/buy").default({}));


