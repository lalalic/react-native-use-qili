import React from "react";
import { View, Text, Button, TextInput } from "react-native";
import { Qili } from "react-native-use-qili/store";
import * as IAP from 'react-native-iap';
const l10n=globalThis.l10n

export default function PaymentLink({ sku = "2.10K" }) {
    const [balance, setBalance]=React.useState(0)
    const [amount, setAmount] = React.useState(1);
    const [product, setProduct] = React.useState({});
    React.useEffect(() => {
        Qili.fetch({query:`query{me{balance}}`})
            .then(data=>setBalance((data.me.balance)))

        IAP.initConnection().then(async () => {
            IAP.purchaseUpdatedListener(async (purchase) => {
                const { verifyIapReceipt: result, error } = await Qili.fetch({
                    query: `mutation($receipt:String!, $transactionId:String!){
                            verifyIapReceipt(receipt:$receipt, transactionId:$transactionId)
                        }`,
                    variables: { receipt: purchase.transactionReceipt, transactionId: purchase.transactionId },
                });
                if (error) {
                    this.emit("onError", error);
                    return;
                }
                await IAP.finishTransaction({ purchase, isConsumable: true });
            });
            if (sku) {
                const [product] = await IAP.getProducts({ skus: [sku] });
                setProduct(product);
            }
        });
        return () => IAP.endConnection();
    }, [sku]);

    const buy = React.useCallback(async (sku, amount) => {
        await IAP.requestPurchaseWithQuantityIOS({ sku, quantity: amount });
    }, []);

    const restore = React.useCallback(() => IAP.getPendingPurchasesIOS(), []);

    return (
        <View style={{ display: "flex", height: "100%", flexDirection: "column", backgroundColor: "black" }}>
            <View style={{ height: 100, flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                <Text>{l10n.Balance}:</Text>
                <Text>{balance}</Text>
            </View>
            <View style={{ backgroundColor: "darkcyan", alignItems: "center", padding: 20, margin: 20 }}>
                <View style={{ paddingBottom: 10, height: 50 }}><Text style={{ fontSize: 20, }}>{product.localizedPrice}</Text></View>
                <View style={{ paddingBottom: 10, height: 50 }}><Text style={{ fontSize: 18, }}>{product.title}</Text></View>
                <View style={{}}><Text style={{ fontSize: 16, }}>{product.description}</Text></View>
            </View>
            <View style={{ flexGrow: 1, alignItems: "center" }}>
                <Text>{l10n.Amount}</Text>
                <TextInput style={{ width: 100, height: 40, marginTop: 10, fontSize: 20, backgroundColor: "white", textAlign: "center" }}
                    value={amount + ""}
                    onChangeText={value => setAmount(value ? parseInt(value) : "")}
                    onBlur={e => amount == "" && setAmount(1)} />
            </View>
            <View>

                <View style={{ height: 50, marginBottom: 30, alignItems: "center", justifyContent: "center" }}>
                    <Button color="gray" onPress={() => restore()} title={l10n.Restore} />
                </View>

                <View style={{ backgroundColor: "darkcyan", width: "100%", height: 50, marginBottom: 30, alignItems: "center", justifyContent: "center" }}>
                    <Button color="white" onPress={() => buy(product.productId, amount)} title={l10n.Topup} />
                </View>


            </View>
        </View>
    );
}
