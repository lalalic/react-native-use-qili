import * as IAP from "react-native-iap";
import EventEmitter from "eventemitter3";
import { Qili } from "../store";

const skus = {};
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

		async start() {
			await IAP.initConnection();
			this.listeners.push(
				IAP.purchaseUpdatedListener(async (purchase) => {
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
						await IAP.finishTransaction({purchase})
						console.debug(`purchase ${purchase.productId}[${purchase.transactionId}] done`)
						this.emit("onPurchase",result)
					} catch (error) {
						this.emit("onError", error);
					}
				})
			);

			this.listeners.push(
				IAP.purchaseErrorListener((error) => {
					this.emit("onError", error);
				})
			);
		}

		async buy(sku) {
			if (skus.consumables.indexOf(sku) != -1) {
				return await IAP.requestPurchase({ sku });
			} else if (skus.subscriptions.indexOf(sku) != -1) {
				return await IAP.requestSubscription({ sku });
			}
		}

		async getProducts() {
			const consumables = (
				await IAP.getProducts({ skus: skus.consumables })
			).map(ios2IapProduct);

			const subscriptions = (
				await IAP.getSubscriptions({ skus: skus.subscriptions })
			).map(ios2IapProduct);

			return Promise.resolve({
				activeProducts: null,
				productsForSale: [...consumables, ...subscriptions],
			});
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

		restore() {}
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
						localizedTitle: `${productId.replace(
							"wb",
							""
						)}\nTokens`,
					};
				case "subs":
					return {
						type: "renewable_subscription",
						group: "wx-sub",
						groupIndex: i,
						subscriptionDuration: `P${subscriptionPeriodNumberIOS}${subscriptionPeriodUnitIOS[0]}`,
						subscriptionIntroPhases: [
							{
								title: "free 1000\ntokens/month",
							},
							{
								title: `$${(
									parseFloat(a.price) /
									parseInt(
										subscriptionPeriodUnitIOS == "YEAR"
											? 12
											: subscriptionPeriodNumberIOS
									)
								).toFixed(2)} for 10*1000\ntokens/Month`,
							},
						],
					};
			}
		})(type),
	};
}

/*
const activeProducts = [
		{
			id: "5e5198930c48ed07aa275fd9",
			type: "renewable_subscription",
			sku: "membership_1",
			group: "3e5198930c48ed07aa275fd8",
			groupName: "subscription_group_1",
			localizedTitle: "Membership 1 month",
			localizedDescription: "Become a member of the community",
			localizedPrice: "$9.99",
			price: 9.99,
			currency: "USD",
			subscriptionDuration: "P1M",
			subscriptionIntroPhases: [],
			subscriptionState: 'active',
			isSubscriptionRenewable: true,
			platform: 'ios',
			groupIndex:0,
		}
	];
const productsForSale = [
		{
			id: "5e5198930c48ed07aa275fd9",
			type: "renewable_subscription",
			sku: "membership_1",
			group: "3e5198930c48ed07aa275fd8",
			groupName: "subscription_group_1",
			localizedTitle: "Basic",
			localizedDescription: "Become a member of the community",
			localizedPrice: "$9.99",
			price: 9.99,
			currency: "USD",
			subscriptionDuration: "P1M",
			groupIndex:0,
			subscriptionIntroPhases: [
				{
					type: "trial",
					price: 0,
					currency: "USD",
					localizedPrice: "FREE",
					cycleDuration: "P1M",
					cycleCount: 1,
					payment: "upfront"
				},
				{
					type: "intro",
					price: 4.99,
					currency: "USD",
					localizedPrice: "$4.99",
					cycleDuration: "P1M",
					cycleCount: 3,
					payment: "as_you_go"
				}
			]
		},
		{
			id: "5e5198930c48ed07aa275fd8",
			type: "renewable_subscription",
			sku: "membership_6months",
			group: "3e5198930c48ed07aa275fd8",
			groupName: "subscription_group_1",
			localizedTitle: "Premium",
			localizedDescription: "Become a member of the community",
			localizedPrice: "$39.99",
			price: 39.99,
			currency: "USD",
			groupIndex:1,
			subscriptionDuration: "P6M",
			subscriptionIntroPhases: [
				{
					type: "trial",
					price: 0,
					currency: "USD",
					localizedPrice: "FREE",
					cycleDuration: "P1M",
					cycleCount: 2,
					payment: "upfront"
				},
				{
					type: "intro",
					price: 4.99,
					currency: "USD",
					localizedPrice: "$4.99",
					cycleDuration: "P1M",
					cycleCount: 3,
					payment: "as_you_go"
				}
			]
		},
		{
			id: "5e5198930c48ed07aa275fd7",
			type: "renewable_subscription",
			sku: "membership_12months",
			group: "3e5198930c48ed07aa275fd8",
			groupName: "subscription_group_1",
			localizedTitle: "Pro",
			localizedDescription: "Become a member of the community",
			localizedPrice: "$69.99",
			price: 69.99,
			currency: "USD",
			groupIndex:2,
			subscriptionDuration: "P1Y",
			subscriptionIntroPhases: [
				{
					type: "trial",
					price: 0,
					currency: "USD",
					localizedPrice: "FREE",
					cycleDuration: "P1M",
					cycleCount: 1,
					payment: "upfront"
				},
				{
					type: "intro",
					price: 4.99,
					currency: "USD",
					localizedPrice: "$4.99",
					cycleDuration: "P1M",
					cycleCount: 3,
					payment: "as_you_go"
				}
			]
		},
	]
*/
