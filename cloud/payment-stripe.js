function stripe({
    apiKey, 
    endpointSecret, 
    onPurchase=defaultOnPurchase, 
    path="/stripe/pay", 
    transactionFee=0.3, 
    transactionRate=2.9,
    extractPurchase=defaultExtractPurchase,
    paymentLink, prefill_email="",
}){
    Cloud.addModule(require("./payment"))
    const module= {
        name:"stripe payment",
        async static(service){
            service.on(path, async function(req, response){
                try {
                    if(!req.user){
                        throw new Error('not authenticated user')
                    }
                    const payload=req.body
                    const event =  payload //stripe.webhooks.constructEvent(payload, req.headers['stripe-signature'], endpointSecret);                
                    // Handle the checkout.session.completed event
                    if (event.type === 'checkout.session.completed') {
                        try{
                            const [purchase,user]=await extractPurchase({event, req,transactionFee,transactionRate})
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
        }
    }

    if(paymentLink){
        module.typeDefs=`
            extend type Query{
                paymentLink: String
            }
        `
        module.resolver.Query.paymentLink=async ($1,$2,ctx)=>{
            if(typeof(paymentLink)=="function"){
                return await paymentLink(ctx,$2)
            }
            
            if(typeof(paymentLink)=="string"){
                const token=ctx.app.resolver.User.token(ctx.user,{expiresIn:'10m'}, ctx)
                const client_reference_id=stripe.encodeClientReferenceId(token)
                return `${paymentLink}?prefill_email=${ctx.user.email||prefill_email}&client_reference_id=${client_reference_id}`
            }
        }
    }

    return module
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

async function defaultExtractPurchase({event, req, transactionFee, transactionRate}){
    event=removeNullKeys(event)
    const {type,  data:{object:{
        client_reference_id,
        id,//xxxx
        object,//"checkout.session"
        payment_link,//plink_1OBpbSHKHUCpvkuPEcgLUGx9
        payment_status, //paid
        status,// "complete"
        created, 

        customer_details:{email, phone},
        currency,//usd, cad
        amount_total,//1$=100, 10$=1000
        currency_conversion:{source_currency="usd",fx_rate="1.0"}={},
        paid=Math.ceil((amount_total)/parseFloat(fx_rate)*1000),
        validPaid=Math.ceil((amount_total-100*transactionFee)*(100-transactionRate)/100/parseFloat(fx_rate)*1000)
    }}}=event

    const purchase={
        _id:`stripe_${id}`,
        provider:'stripe',
        sku: payment_link, 
        paid,validPaid,
        expires_date_ms: (created+10*365*24*60*60)*1000,//10 years
        purchase_date_ms: created*1000,
        original_purchase_date_ms: created*1000,
        _event: removeNullKeys(event),
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