module.exports=({path='/verifyReceipt', password, onVerified, ...listeners}={})=>({
    name:"iap",
    typeDefs:`
        type Product{
            id: String!,
            type: String!,
            sku: String!,
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

        extend type User{
            activeProducts: [String]
            productsForSale: [Product]
        }

        extend type Mutation{
            buy(sku: String!):Boolean
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
        },

        Mutation:{
            async buy(_,info,{app,user}){
                const purchase=await app.createEntity("Purchase",{...info,author:user._id, createdAt:new Date()})
                return !!purchase
            },
            async verifyIapReceipt(_,{receipt, transactionId},ctx){
                debugger
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
                const result=await onVerified?.(_,purchase,ctx)
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