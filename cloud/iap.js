module.exports=({path='/verifyReceipt', password, onVerified}={})=>({
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
                await app.createEntity("Purchase",{...info,author:user._id, createdAt:new Date()})
                return true
            },
        }
    },
    static(service){
        service.on(path,async (req, res)=>{
            const data={
                method:"post",
                body: JSON.stringify({
                    password,
                    'receipt-data':req.body,
                    'exclue-old-transations':true
                })
            }
            let done=await fetch("https://buy.itunes.apple.com/verifyReceipt",data)
            if(done.status==21007){
                done=await fetch("https://sandbox.itunes.apple.com/verifyReceipt",data)
            }

            const {data:{
                environment, 
                status, 
                latest_receipt_info:[receipt],
                pending_renewal_info:{sku}
            }}=await done.json()
            
            await onVerified?.({},{sku},{app:req.app, user:req.user})
            res.send({expired:Date.now()>receipt.expires_date_ms})
        })
    }
})