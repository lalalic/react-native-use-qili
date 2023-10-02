import * as IAP from "react-native-iap";
import EventEmitter from "eventemitter3";
import { Qili } from "../store";

const skus = {subscriptions:[], consumables:[]};
export default new Proxy(
	new (class extends EventEmitter {
		constructor() {
			super(...arguments);
			this.listeners = [];
		}

		//'onUserUpdate' | 'onDeferredPurchase' | 'onError' | 'onBuyRequest' | 'onReceipt'
		addEventListener(event) {
			return this.on(...arguments);
		}

		removeEventListener() {
			this.removeListener(...arguments);
		}

		end() {
			this.listeners.forEach((a) => a.remove());
			IAP.endConnection();
		}

		async handlePurchase(purchase){
			try {
				this.emit("onReceipt", { receipt: purchase.transactionReceipt })
				const {verifyIapReceipt:result, error} = await Qili.fetch({
					query: `mutation($receipt:String!, $transactionId:String!){
							verifyIapReceipt(receipt:$receipt, transactionId:$transactionId)
						}`,
					variables: { receipt: purchase.transactionReceipt, transactionId:purchase.transactionId },
				})
				if(error){
					this.emit("onError", error);
					return 
				}
				
				this.emit("onPurchase",result,purchase.productId)
				if(skus.subscriptions.indexOf(purchase.productId)!=-1){
					this.emit("onUserUpdate", purchase.productId)
				}
				await IAP.finishTransaction({purchase})
				console.debug(`purchase ${purchase.productId}[${purchase.transactionId}] done`)
			} catch (error) {
				this.emit("onError", error);
			}
		}

		async start() {
			await IAP.initConnection();
			this.listeners.push(
				IAP.purchaseUpdatedListener(purchase=>this.handlePurchase(purchase))
			);

			this.listeners.push(
				IAP.purchaseErrorListener((error) => {
					this.emit("onError", error);
				})
			);

			this.consumables = (await IAP.getProducts({ skus: skus.consumables })).map(ios2IapProduct)
				.sort((a,b)=>skus.consumables.indexOf(a.id)-skus.consumables.indexOf(b.id));

			this.subscriptions = (await IAP.getSubscriptions({ skus: skus.subscriptions })).map(ios2IapProduct)
				.sort((a,b)=>skus.subscriptions.indexOf(a.id)-skus.subscriptions.indexOf(b.id));
		}

		async buy(sku) {
			const purchase=await (async ()=>{
				if (skus.consumables.indexOf(sku) != -1) {
					return await IAP.requestPurchase({ sku });
				} else if (skus.subscriptions.indexOf(sku) != -1) {
					return await IAP.requestSubscription({ sku });
				}
			})();

			if(purchase){
				await this.handlePurchase(purchase)
			}
			return purchase
		}

		async getProducts() {
			const {me:{activeProducts}}= await Qili.fetch({
				query:`query{
					me{
						activeProducts
					}
				}`
			})

			return Promise.resolve({
				activeProducts: activeProducts.map(sku=>this.subscriptions.find(a=>a.sku==sku))
					.filter(a=>!!a)
					.map(a=>(a.isActive=true, a)),
				productsForSale: [...this.consumables, ...this.subscriptions],
			})
		}

		set products(v) {
			Object.assign(skus, v);
		}

		setUserTags() {}

		login() {}

		logout() {}

		setDeviceParams() {}

		showManageSubscription() {
			//link to "itms-apps://apps.apple.com/account/subscriptions"
		}

		async restore() {
			await IAP.getReceiptIOS?.(true);
			await IAP.getPendingPurchasesIOS?.();
		}
	})(),
	{
		get(target, key) {
			return function () {
				return target[key](...arguments);
			};
		},
	}
);

function ios2IapProduct(
	{
		type,
		productId,
		title,
		localizedTitle = title,
		description,
		localizedDescription = description,
		subscriptionPeriodNumberIOS,
		subscriptionPeriodUnitIOS,
		introductoryPriceAsAmountIOS,
		introductoryPriceNumberOfPeriodsIOS,
		introductoryPricePaymentModeIOS,
		introductoryPriceSubscriptionPeriodIOS,
		...a
	},
	i
) {
	return {
		...a,
		id: productId,
		sku: productId,
		title,
		localizedTitle,
		description,
		localizedDescription,
		...((type) => {
			switch (type) {
				case "iap":
					return {
						type: "consumable",
					};
				case "subs":
					return {
						type: "renewable_subscription",
						group: "default",
						groupIndex: i,
						subscriptionDuration: `P${subscriptionPeriodNumberIOS}${subscriptionPeriodUnitIOS[0]}`,
					}
			}
		})(type),
	};
}