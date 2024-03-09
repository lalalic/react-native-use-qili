/**
 * Provide apple payment receipt verify
 * @param {object} 
 *      path=/verifyReceipt, it's webhook called by apple to notify payment
 *      password: configured in apple payment, used when retrieve transaction from apple
 *      onPurchase: 
 * @returns 
 */
 module.exports=({path='/verifyReceipt', password, onPurchase}={})=>({
    name:"apple payment",
    typeDefs:`
        type Product{
            id: String!
            type: String!
            sku: String!
            group: String
            groupName: String
            title: String
            description: String
            localizedPrice: String
            price: Float
            currency: String
            subscriptionDuration: String
            subscriptionIntroPhases: [JSON]
            status: String
        }

        type Purchase{
            id: String!
            sku: String!
            expires_date_ms: Int
            purchase_date_ms: Int
            original_purchase_date_ms: Int
            upgradeFrom: String
            subscription_group_identifier: String
            original_transaction_id: String
        }

        type Transaction{
            id: String!
            product: String!
            cost: Int!
            amount: Int
            author: String
        }

        extend type User{
            activeProducts: [String]
            productsForSale: [Product]
            transactions: [Transaction]
            balance: Int
        }

        extend type Mutation{
            buy(sku: String!):Purchase
            consume(info: JSON!): Transaction
            verifyIapReceipt(receipt:String!, transactionId:String!):JSON
        }
    `,

    indexes:{
        Product:[{sku:1}, {status:1}],
        Purchase:[{author:1, expires_date_ms:1}]
    },

    resolver:{
        User:{
            async activeProducts(_, {}, {app, user}){
                const actives=await app.findEntity("Purchase",{author:user._id,expires_date_ms:{$gt:Date.now()}})
                return [actives.sort((a,b)=>a.expires_date_ms-b.expires_date_ms).map(({sku})=>sku).pop()]
            },
            async productsForSale(_,{},{app,user}){
                return await app.findEntity("Product", {status:{$ne:"active"}})
            },
            async transactions(_,{},{app,user}){
                return await app.findEntity("Transaction", {author:user._id})
            }
        },

        Mutation:{
            async buy(_,info,{app,user}){
                return await app.createEntity("Purchase",{...info,author:user._id, createdAt:new Date()})
            },
            async consume(_, {product, cost, ...info}, {app,user}){
                await app.patchEntity("User",{_id:user._id}, {$inc:{balance: -cost}})
                return await app.createEntity("Transaction", {...info, product, cost, author:user._id,})
            },
            async verifyIapReceipt(_,{receipt, transactionId},ctx){
                const request={
                    method:"post",
                    body: JSON.stringify({
                        password,
                        'receipt-data':receipt,
                        'exclude-old-transations':true
                    })
                }
                let done=await fetch("https://buy.itunes.apple.com/verifyReceipt",request)
                let data=await done.json()
                if(data.status==21007){
                    done=await fetch("https://sandbox.itunes.apple.com/verifyReceipt",request)
                    data=await done.json()
                }
                
                const { status,  latest_receipt_info }=data
                if(status!==0){
                    throw new Error(status)
                }
                const i=latest_receipt_info.findIndex(a=>a.transaction_id==transactionId)
                const purchase=latest_receipt_info[i]
                if(purchase.subscription_group_identifier){
                    const last=latest_receipt_info.find((a,k)=>k>i && 
                            a.subscription_group_identifier==purchase.subscription_group_identifier &&
                            a.original_transaction_id==purchase.original_transaction_id && 
                            a.expires_date_ms==purchase.expires_date_ms)
                    if(last){
                        purchase.upgradeFrom=last.product_id
                    }
                }

                purchase.sku=purchase.product_id
                purchase._id=purchase.transaction_id;
                ["expires_date_ms","purchase_date_ms","original_purchase_date_ms"]
                    .forEach(k=>purchase[k]=parseInt(purchase[k]))
                
                const purchased=await ctx.app.resolver.Mutation.buy(_, purchase, ctx )
                if(!purchased)
                    return {}
                
                ctx.app.emit('purchase', purchase)
                const result=await onPurchase?.(_,purchase,ctx)
                return result==undefined ? data : result
            }
        }
    },
    static(service){
        service.on(path,(req, res)=>{
            if(req.method!=="POST"){
                res.reply(404)
                return 
            }
            console.debug(req.body)
        })
    }
})