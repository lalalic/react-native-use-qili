function stripe({
    path="/stripe/pay", 
    secretKey=process.env["stripe.secretKey"],  
    onPurchase=defaultOnPurchase, 
    extractPurchase=defaultExtractPurchase,
    endpointSecret, paymentLink, prefill_email="",transactionFee=0.3, transactionRate=4.5,
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
                    const event=req.body
                    if(event.type=='checkout.session.completed'){
                        try{
                            const [purchase,user]=await extractPurchase({event, req, secretKey})
                            if(!user){
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
        currency,//usd, cad
        amount_total,//1$=100, 10$=1000
        currency_conversion:{source_currency="usd",fx_rate="1.0"}={},
    }}}=event
    const token=client_reference_id ? stripe.decodeClientReferenceId(client_reference_id) : null
    const user= token ? await req.app.decode(token) : await req.app.getUserByContact(phone||email)

    const [paid, validPaid, receipt_url]=await (async ()=>{
        /** 
         * stripe events order: checkout.session.completed, charge.update(get net, amount, fee)
         * This hack code is to get net and fee, so we don't do the math
         */
        let tries=5
        const v1=`https://api.stripe.com/v1/payment_intents/${payment_intent}?expand[]=latest_charge.balance_transaction`
        return new Promise(async function retrieve(resolve,reject){
            try{
                if(--tries ==0){
                    reject()
                    return 
                }
                
                const {latest_charge:{receipt_url, balance_transaction:{net, amount}}}=await (await fetch(v1,{headers:{Authorization:`Bearer ${secretKey}`}})).json()
                return resolve([amount*1000, net*1000, receipt_url])
            }catch(e){
                setTimeout(()=>retrieve(resolve,reject), 3000)
            }
        })
    })();
    

    const purchase={
        _id:`stripe_${id}`,
        provider:'stripe',
        sku: payment_link, 
        paid,validPaid,
        expires_date_ms: (created+10*365*24*60*60)*1000,//10 years
        purchase_date_ms: created*1000,
        original_purchase_date_ms: created*1000,
        event:{payment_intent, receipt_url, currency, amount:amount_total}
    }

    return [purchase, user]
}

async function defaultOnPurchase({app,user,purchase, event}){
    await app.patchEntity("User", {_id:user._id}, {$inc:{balance:purchase.validPaid}})
    app.emit('purchase.verified', purchase.validPaid)
}

module.exports=stripe