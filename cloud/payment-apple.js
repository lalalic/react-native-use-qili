/**
 * Provide apple payment receipt verify
 * @param {object} 
 *      path=/verifyReceipt, it's webhook called by apple to notify payment
 *      password: configured in apple payment, used when retrieve transaction from apple
 *      onPurchase: 
 * @returns 
 */
 module.exports=({
    path='/verifyReceipt', 
    password, 
    onPurchase,
    extractPurchase=defaultExtractPurchase,
}={})=>{
    if(!onPurchase){
        throw new Error("apply payment must proide onPurchase to persist user's purchase")
    }
    Cloud.addModule(require("./payment"))
    return {
        name:"apple payment",
        typeDefs:`
            extend type Mutation{
                verifyIapReceipt(receipt:String!, transactionId:String!):JSON
            }
        `,
        resolver:{
            Mutation:{
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
                    const purchase = extractPurchase(latest_receipt_info, transactionId)
            
                    const purchased=await ctx.app.resolver.Mutation.buy(_, purchase, ctx )
                    if(!purchased)
                        return {}
                    
                    ctx.app.emit('purchase', purchase)
                    const result=await onPurchase?.({app:ctx.app, user:ctx.user, purchase})
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
            })
        }
    }
}

function defaultExtractPurchase(latest_receipt_info, transactionId) {
    const i = latest_receipt_info.findIndex(a => a.transaction_id == transactionId)

    const purchase = latest_receipt_info[i]
    if (purchase.subscription_group_identifier) {
        const last = latest_receipt_info.find((a, k) => k > i &&
            a.subscription_group_identifier == purchase.subscription_group_identifier &&
            a.original_transaction_id == purchase.original_transaction_id &&
            a.expires_date_ms == purchase.expires_date_ms)
        if (last) {
            purchase.upgradeFrom = last.product_id
        }
    }

    purchase.sku = purchase.product_id
    purchase._id = purchase.transaction_id;
    ["expires_date_ms", "purchase_date_ms", "original_purchase_date_ms"]
        .forEach(k => purchase[k] = parseInt(purchase[k]))
    return purchase
}
