module.exports=({path, callbackURL, password, ...props}={})=>({
    name:"iap-receipt-validation",
    static(service){
        service.on(path||'/verifyReceipt',async (req, res)=>{
            const res=await fetch(callbackURL||"https://sandbox.itunes.apple.com/verifyReceipt",{
                method:"post",
                body: JSON.stringify({
                    'receipt-data':req.body,
                    password,//from apple connection
                    'exclue-old-transations':true,
                    ...props
                })
            })

            const {data:{latest_receipt_info:[receipt]}}=await res.json()
            
            res.send({expired:Date.now()>receipt.expires_date_ms})
        })
    }
})