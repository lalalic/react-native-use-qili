import React from "react";
import Iaphub from "react-native-iaphub"
import { IaphubDataProvider } from 'react-native-iaphub-ui';

export default function MyIaphubDataProvider({products,onPurchase, ...props}) {
    Iaphub.products=products
    React.useEffect(() =>{
        onPurchase && Iaphub.addEventListener('onPurchase', onPurchase)
        return () => Iaphub.end?.()
    },[]);
    return <IaphubDataProvider {...{ appId: "A", apiKey: "A", userId: "A",}} {...props} />;
}
