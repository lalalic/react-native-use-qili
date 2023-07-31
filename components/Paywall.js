import React from "react"
import { View, Linking, Text } from "react-native"
import {IaphubDataConsumer, Paywall, PaywallSubscriptionGroup} from 'react-native-iaphub-ui'
import ActiveProductsWrapper from "react-native-iaphub-ui/src/paywall/active-products-wrapper"

export default function MyPaywall({l10n={}, consumable=true, subscriptable=true, formatProduct=a=>a, children}){
    return (
        <View style={{flex:1}}>
            <IaphubDataConsumer>
            {({activeProducts, productsForSale, ...iaphubData}) =>{
                productsForSale.forEach(formatProduct)
                return ( 
                    <View style={{flex:1}}>
                        {consumable && <View style={{height:200,backgroundColor:"#999999"}}>
                            {children}
                            <Paywall style={{flex:1}}
                                {...iaphubData} Restore={null} 
                                ProductTitle={props=><ProductTitle {...props} l10n={l10n}/>}
                                selectedActiveProductIndex={null}
                                showBuySuccessAlert={false}
                                productsForSale={productsForSale?.filter(a=>!a.subscriptionDuration).sort((a,b)=>parseFloat(a.price)-parseFloat(b.price))}
                                />
                        </View>}
                        {subscriptable && <PaywallSubscriptionGroup style={{flexGrow:1}}
                            {...iaphubData}
                            Restore={null} 
                            ProductPrice={()=>null}
                            ProductTitle={props=><ProductTitle {...props} l10n={l10n}/>}
                            showBuySuccessAlert={false}
                            activeProducts={activeProducts?.filter(a=>!!a.subscriptionDuration)}
                            productsForSale={productsForSale?.filter(a=>!!a.subscriptionDuration)}
                            ActiveProductsWrapper={props=><MyActiveProductsWrapper l10n={l10n} {...props}/>}
                            onShowManageSubscriptions={async e=>{
                                const url="itms-apps://apps.apple.com/account/subscriptions"
                                if(await Linking.canOpenURL(url)){
                                    Linking.openURL(url)
                                }
                            }}
                            />}
                    </View>
                    )
            }}
            </IaphubDataConsumer>
        </View>
    )
}

function ProductTitle({product, isSelected, l10n}){
    return (
        <View style={{flex:1, alignItems:"center",marginBottom:10}}>
            <Text style={{textAlign:"center", fontWeight:"bold", color:isSelected ? "white" : "black"}}>
                {l10n[product.title]}
            </Text>
        </View>
    )
}

function MyActiveProductsWrapper({l10n, ...props}){
    return (
        <View style={{flew:1, height:100, justifyContent:"center"}}>
            {!props.activeProducts && <View style={{alignItems:"center"}}>
                <Text style={{fontSize:20}}>{l10n["Get Membership"]}</Text>
            </View>}
            <ActiveProductsWrapper {...props}/>
        </View>
    )
}