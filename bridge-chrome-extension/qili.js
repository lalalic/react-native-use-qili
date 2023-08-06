const headers={
	"x-application-id":apiKey,
	"x-access-token":accessToken
}
const Qili={
	service:api||"https://api.qili2.com/1/graphql",
	apiKey,
	async fetch(request){
		const res=await fetch(this.service,{
			method:"post",
			headers:{
				'Content-Type': 'application/json',
				...headers
			},
			body:JSON.stringify(request)
		})
		const {data}= await res.json()
		if(!data){
            throw new Error(res.statusText)
        }

        if(data.errors){
            throw new Error(data.errors.map(a=>a.message).join("\n"))
        }
		return data
	},
	subscribe(request, callback){
		const {SubscriptionClient} = SubscriptionsTransportWs
		let first=true
		//@Why: a shared client can't work, is it because close method is changed ???
		const client=new SubscriptionClient(this.service.replace(/^http/, "ws"),{
			reconnect:true,
			timeout: 0.5*60*1000,
			connectionParams:{
				...headers,
				request:{
					id:request.id,
					variables: request.variables
				},
			},
			connectionCallback(error){
				if(error){
					console.error(`helper[subscription] failed: ${error.message}`)
					first=true
				}else{
					console.info(first ? 'helper[subscription] success!' : 'helper[subscription] health checked!')
					first=false
				}
			}
		})

		const sub=client.request({query:"*",...request}).subscribe(
			function onNext(data){
				callback?.(data)
			},
			function onError(error){
				callback?.({data:{error}})
			}
		)
		
		return ()=>{
			sub.unsubscribe()
			client.close()
		}
	},
	schedule(fx, when, alert, ahead=500, aday=24*60*60*1000){
		if((when-Date.now()) < aday){
			return setTimeout(()=>{
				setTimeout(fx, when-Date.now())
				alert?.()
			}, when-Date.now()-ahead)
		}else{
			return setTimeout(()=>schedule(...arguments),aday)
		}
	}
}

