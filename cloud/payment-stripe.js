function stripe({
    path="/stripe/pay", 
    secretKey=process.env["stripe.secretKey"],  
    onPurchase=defaultOnPurchase, 
    extractPurchase=defaultExtractPurchase,
    endpointSecret, paymentLink, prefill_email="",transactionFee=0.3, transactionRate=2.9,
}={}){
    Cloud.addModule(require("./payment"))
    const cloudModule= {
        name:"stripe payment",
        async static(service){
            service.on(path, async function(req, response){
                try {
                    if(!req.user){
                        throw new Error('not authenticated user')
                    }
                    const payload=req.body
                    const event =  payload 
                    if (event.type === 'checkout.session.completed') {
                        try{
                            const [purchase,user]=await extractPurchase({event, req, secretKey})
                            if(!user?.id){
                                throw new Error("token is wrong")
                            }
                            const done = await req.app.resolver.Mutation.buy(
                                {}, 
                                purchase, 
                                {app:req.app, user}
                            );
                            if(!done){
                                throw new Error("maybe duplicate key error")
                            }
                            req.app.emit('purchase', purchase)
                            await onPurchase?.({app:req.app, user, event, purchase})
                        }catch(e){
                            if(e.message.indexOf('duplicate key error')==-1){
                                throw e
                            }else{
                                console.warn('stripe payment already addressed!')
                            }
                        }
                    }
                    
                    response.status(200).end()
                } catch (err) {
                    response.status(400).end(err.message)
                }
            })
        },
        events:{
            purchase(){
                console.debug("purchased")
            },
            ["purchase.verified"](){
                console.debug("purchase.verified set user.balance")
            }
        }
    }

    return cloudModule
}

stripe.encodeClientReferenceId=function(token){
    const pieces=token.split(".")
    const seperators=pieces.map(a=>a.length).slice(0,-1).map(a=>a.toString(16).padStart(2,'0'))
    return seperators.length+seperators.join("")+pieces.join("")
}

stripe.decodeClientReferenceId=function(client_reference_id){
    const length=parseInt(client_reference_id[0])
    let token=client_reference_id.substring(length*2+1)
    const pieces=new Array(length).fill(0)
        .map((a,i)=>{
            const start=i*2+1
            const len=parseInt(client_reference_id.substring(start,start+2),16)
            a=token.substring(0,len)
            token=token.substring(len)
            return a
        })
    pieces.push(token)
    return pieces.join(".")
}

function removeNullKeys(obj) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (obj[key] === null) {
                delete obj[key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                removeNullKeys(obj[key]);
                if (Object.keys(obj[key]).length === 0) {
                    delete obj[key];
                }
            }
        }
    }
    return obj
}

async function defaultExtractPurchase({event, req, secretKey}){
    const {type,  data:{object:{
        client_reference_id,
        id,//xxxx
        object,//"checkout.session"
        payment_intent,//pi->ch->txn->fee 
        payment_link,//plink_1OBpbSHKHUCpvkuPEcgLUGx9
        payment_status, //paid
        status,// "complete"
        created, 
        customer_details:{email, phone},
    }}}=event
    const v1=`https://api.stripe.com/v1/payment_intents/${payment_intent}?expand[]=latest_charge.balance_transaction`
    const {latest_charge:{balance_transaction:{net, amount}}}=await (await fetch(v1,{headers:{Authorization:`Bearer ${secretKey}`}})).json()

    const purchase={
        _id:`stripe_${id}`,
        provider:'stripe',
        sku: payment_link, 
        paid:amount*1000,
        validPaid:net*1000,
        expires_date_ms: (created+10*365*24*60*60)*1000,//10 years
        purchase_date_ms: created*1000,
        original_purchase_date_ms: created*1000,
    }

    const token=client_reference_id ? stripe.decodeClientReferenceId(client_reference_id) : null
    
    const user=token ? await req.app.decode(token) : req.app.getUserByContact(phone||email)
    return [purchase, user]
}

async function defaultOnPurchase({app,user,purchase, event}){
    await app.patchEntity("User", {_id:user._id}, {$inc:{balance:purchase.validPaid}})
    app.emit('purchase.verified', purchase.validPaid)
}

module.exports=stripe