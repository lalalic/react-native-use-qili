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
            activeProducts: [Product]
            productsForSale: [Product]
        }

        extend type Mutation{
            buy(sku: String!):Boolean
            verifyIapReceipt(receipt:String!, transactionId:String!):JSON
        }
    `,

    indexes:{
        Product:[{sku:1}, {status:1}],
        Purchase:[{sku:1, author:1}]
    },

    resolver:{
        User:{
            async activeProducts(_, {}, {app, user}){
                const actives=await app.findEntity("Purchase",{author:user._id,expires:{$gt:Date.now()}})
                return actives.map(({sku, expires})=>{
                    const product=app.findEntity("Product", {sku})
                    return {...product, expires: expires-Date.now()}
                })
            },
            async productsForSale(_,{},{app,user}){
                return await app.findEntity("Product", {status:{$ne:"active"}})
            },
        },

        Mutation:{
            async buy(_,info,{app,user}){
                try{
                    await app.createEntity("Purchase",{...info,author:user._id, createdAt:new Date()})
                    return true
                }catch(e){
                    return false
                }
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
                purchase._id=purchase.transaction_id
                ctx.app.emit('purchase', purchase)
                if(status===0){
                    const purchased=await ctx.app.resolver.Mutation.buy(_, purchase, ctx )
                    if(purchased){
                        const result=await onVerified?.(_,purchase,ctx)
                        return result==undefined ? data : result
                    }
                    return {}
                }
                throw new Error(status)
            }
        }
    },
    static(service){
        service.on(path,(req, res)=>{
            if(req.method!=="post"){
                res.reply(404)
                return 
            }
        })
    }
})