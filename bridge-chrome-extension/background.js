
function uid(){
	const generateNumber = (limit) => {
		const value = limit * Math.random();
		return value | 0;
	}
	const generateX = () => {
		const value = generateNumber(16);
		return value.toString(16);
	}
	const generateXes = (count) => {
		let result = '';
		for(let i = 0; i < count; ++i) {
			result += generateX();
		}
		return result;
	}
	const generateconstant = () => {
		const value = generateNumber(16);
		const constant =  (value & 0x3) | 0x8;
		return constant.toString(16);
	}
		
	const generate = () => {
				const result = generateXes(8)
						+ '-' + generateXes(4)
						+ '-' + '4' + generateXes(3)
						+ '-' + generateconstant() + generateXes(3)
						+ '-' + generateXes(12)
				return result;
	};
	return generate()
}

class MultithreadQueue{
	then(task){
		task();
		return this
	}
}

class Service{
	constructor(props){
		Object.assign(this, props)
		this.sequence=props.multithread ? new MultithreadQueue() : Promise.resolve()
		this.stat={helps:0, errors:0}
		this.run(props)
		console.log(`service[${props.name}] started...`)
	}

	set multithread(v){
		this.sequence=v ? new MultithreadQueue() : Promise.resolve()
	}

	clear(){
		this.sequence=Promise.resolve()
	}
	
	run(props){
		
	}

	consume1(ask){

	}

	async handleResponse(response, ask){
		return response
	}

	available(){
		return true
	}

	async try1(){
		try{
			return await this.consume1(...arguments)
		}catch(e){
			console.error(e.message)
		}
	}

	enqueue(ask, done){
		const task=async ()=>{
			let timer
			try{
				timer=setTimeout(()=>{throw new Error("timeout")}, 60*1000)
				let response=await this.consume1(ask)
				response = await this.handleResponse(response, ask)
				done( response )
				this.stat.helps++
				console.debug({...ask, response})
				chrome.browserAction.setBadgeBackgroundColor({color:"#00FF00"})
			}catch(error){
				this.stat.errors++
				chrome.browserAction.setBadgeBackgroundColor({color:"#FF0000"})
				console.error({...ask, error})
			}finally{
				clearTimeout(timer)
			}
		}
		this.sequence=this.sequence.then(task, task)
		return this.sequence
	}

	async upload(dataURI, key=`$temp/1/${this.name}/${Date.now()}`){
		return (await this.batchUpload([dataURI],key))[0]
	}
	
	async batchUpload(images, rootKey=`$temp/1/${this.name}/${Date.now()}`){
		const {keys, querys, variables}=images.reduce((all, a,i)=>{
			const k=`key${i}`
			all.keys.push(k)
			all.querys.push(`
				token${i}:file_upload_token(key:$${k}){
					token
					key
				}
			`)
			all.variables[k]=`${rootKey}/${i}`
			return all
		},{keys:[],querys:[],variables:{}})

		const query=`query a(${keys.map(k=>`$${k}:String`).join(",")}){
			${querys.join("\n")}
		}`
		const data=await Qili.fetch({query,variables})

		const tokens=Object.values(data)
		return Promise.all(images.map(async (dataURI,i)=>{
			const form=new FormData()
			form.append('file', await (await fetch(dataURI)).blob())
			Object.entries(tokens[i]).forEach(([key, value])=>form.append(key, value))

			const res=await fetch("https://up.qbox.me",{
				method:"post",
				body:form
			})
			const {data}=await res.json()
			return data?.file_create?.url
		}))
	}
}

/** session need be kept if message.options */
class Chatgpt extends Service{
	run({helper, notifyExpiration}){
		const me=this
		this.notifyExpiration=notifyExpiration
		this.getToken=(()=>{
			let accessToken=null
			return async()=>{
				if(accessToken){
					return Promise.resolve(accessToken)
				}
				return new Promise(async (resolve, reject) => {
						const resp = await fetch("https://chat.openai.com/api/auth/session")
						if (resp.status === 403) {
							reject('CLOUDFLARE')
						}
						try {
							const data = await resp.json()
							if (!data.accessToken) {
								reject('ERROR')
								return 
							}

							Qili.schedule(
								()=>accessToken=null,
								data.expires, 
								()=>this.notifyExpiration?.(data.expires),
								10*60*1000
							)
							
							this.session={token: data.accessToken, expires: data.expires}
							resolve(accessToken=data.accessToken)
						} catch (err) {
							console.error(err)
							reject('ERROR')
						}
				})
			}
		})();
		
		this.read=async function read(answer){
			const resRead = answer.getReader()
			while (true) {
				const {done, value} = await resRead.read()
				if (done) break
				const raw=new TextDecoder().decode(value).split("data:").filter(a=>!!a)
				for(let i=raw.length-1; i>-1; i--){
					try{
						const piece=JSON.parse(raw[i])
						if(piece.message.author.role=="assistant"){
							if(piece.message.status=="finished_successfully"){
								return {
									message:piece.message.content.parts.join(""), 
									messageId:piece.message.id, 
									conversationId:piece.conversation_id,
									error: piece.error||undefined
								}
							}
							break
						}
					}catch(e){

					}
				}
			}
			
			throw new Error("Unknow Error")
		}

		this.consume1=async function consume1({message}) {
			const {messageId=uid(), conversationId}=(msg=>{
				if(typeof(msg)=="string" || !msg.options)
					return {}
				if(msg.options.helper==helper){
					const {conversationId, messageId}=msg.options
					return {conversationId, messageId}
				}
				return {}
			})(message);

			const question=message.message||message
			const res = await fetch("https://chat.openai.com/backend-api/conversation", {
					method: "POST",
					headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer " + (await me.getToken()),
					},
					body: JSON.stringify({
							action: "next",
							messages: [
								{
									id: uid(),
									role: "user",
									content: {
										content_type: "text",
										parts: [question]
									}
								}
							],
							model: "text-davinci-002-render",
							...(conversationId? {conversation_id: conversationId} : {}),
							parent_message_id: messageId,
					})
			})
			const response=await this.read(res.body)
			
			if (!message.options) {
				if(response.conversationId){
					fetch(`https://chat.openai.com/backend-api/conversation/${response.conversationId}`,{
						method:"PATCH",
						headers: {
								"Content-Type": "application/json",
								"Authorization": "Bearer " + (await me.getToken()),
						},
						body: JSON.stringify({
							is_visible:false
						})
					})
				}
				delete response.messageId;
				delete response.conversationId;
			}else{
				response.helper=helper
			}
			return response
		}
	}
}

class PageService extends Service{
	run({url}){
		function startTab() {
			chrome.tabs.query({url}, (tabs)=>{
				if(!tabs || !tabs[0]){
					chrome.tabs.create({ url});
				}
			})
		}
		if(url){
			chrome.runtime.onStartup.addListener(startTab)
			chrome.runtime.onInstalled.addListener(startTab)
		}
		const resultPs = {};
		this.consume1=function({message:{fnKey, args}, session}){
			resultPs[session] = (p => Object.assign(new Promise((resolve, reject) => Object.assign(p, { resolve, reject })), p))({});
			
			function try1(tried){
				chrome.tabs.query({url}, function([activeTab]){
					if(activeTab){
						chrome.tabs.sendMessage(activeTab.id, {type:"fnCall", fnKey, args, session})
					}else if(!tried){
						startTab()
						try1(true)
					}else{
						resultP.reject(new Error(`No tab for ${url}`))
					}
				})
			}

			try1()

			return resultPs[session]
		}

		this.bro=new Proxy(this,{
			get(target, fnKey){
				return (...args)=>target.consume1({fnKey, args})
			}
		})

		chrome.runtime.onMessage.addListener(function({event, data}, {tab}){
			if(tab.url!==url)
				return 
			if(event=="fnCall"){
				const { id, result }=data
				const p = resultPs[id];
                delete resultPs[id]
                p.resolve(result)
				return 
			}
			this[`on${event}`]?.(data)
			console.log({event, data, url, })
		})
	}
}

function parseEnvOpts(){
	if(typeof(process)!='undefined' && process.argv?.length>2){
		const [,,...argv]=process.argv
		return argv.reduce((opts, a)=>{
			const [key,value]=a.replace("--","").split("=").map(a=>a.trim())
			switch(key){
				case "chatgpt":
				case "openAI":
				case "bingAI":
					opts[key]=value.toLowerCase()!=="false"
					break
				case "autoAI":
					opts[key]=value.split(",")
			}
			return opts
		},{})
	}
	return {}
}

async function subscribe({helper, defaultChatService=DefaultChatService, ...opts}, services){
	opts={autoAI:globalThis.autoAI, ...opts, ...parseEnvOpts()}
	Object.keys(services).forEach(key=>opts[key]===false && (delete services[key], console.log(`${key} closed`)))

	if(Array.isArray(opts.autoAI)){
		services.autoAI.apis=opts.autoAI
	}

	if(services.autoAI){
		services.autoAI.apis=services.autoAI.apis.filter(a=>!!services[a])
		services.autoAI.printAPI()
	}

	Object.defineProperty(services, "helper", {
		value: helper,
		enumerable:false,
		configurable:false,
	})

	//await Promise.all(Object.values(services).map(a=>a?.available()))
	let helps=await new Promise((resolve)=>chrome.storage.sync.get('helps',data=>resolve(data ? data.helps||0 : 0)))
	await chrome.browserAction.setBadgeText({text:helps+""})
	await chrome.browserAction.setBadgeBackgroundColor({color:"#00FF00"})

	const answer=(ask, response)=>Qili.fetch({
		id:"answerHelp",
		query:`query($session:String!, $response:JSON!, $helper:String){
			answerHelp(session:$session, response:$response, helper:$helper)
		}`,
		variables:{session:ask.session, response, helper}
	})

	const unsub=Qili.subscribe({
		id:"helpQueue",
		query:`subscription($helper:String){
				ask:helpQueue(helper:$helper)
		}`,
		variables:{helper}
	}, function onNext({data:{error, ask}}){//ask: {session, message}
		console.debug({...ask})
		const service=services[ask.message.$service]||(!ask.message.$service&&services[defaultChatService]||(service.autoAI||services.chatgpt||services.bingAI||services.openAI))
		if(!service){
			console.error({ask, error:"No Service"})
			answer(ask, {})
			return 
		}
		chrome.storage.sync.set({ helps: ++helps });
		chrome.browserAction.setBadgeText({ text: helps + "" })
		chrome.browserAction.setBadgeBackgroundColor({color:"#0000FF"})

		service.enqueue(ask,response=>answer(ask, response))
	})

	chrome.runtime.onSuspend.addListener(unsub)

	console.log(`subscribed to ${Qili.apiKey} at ${Qili.service} as ${helper}`)
	return unsub
}

// background_script.js

subscribe({helper},window.bros={
	autoAI: 	new (class extends Service{
					run(){
						this.apis=["chatgpt", "bingAI", "openAI"]
						this.printAPI=()=>console.log(`AutoAI: ${this.apis.join(" -> ")}`)
						this.consume1=async function(){
							for(let service of this.apis){
								try{
									const res=await window.bros[service]?.consume1(...arguments)
									if(!res?.message){
										continue
									}
									return {...res, service}
								}catch(e){
									continue
								}
							}
						}
					}
				})({helper, name:"autoAI"}),
	chatgpt:	new Chatgpt({
					helper,
					name:"chatgpt",
					notifyExpiration(expireTime){
						alert(`Chatgpt need login before ${expireTime}, otherwise bridge service is `)
					}
				}),
	bingAI: 	new (class extends Service{
					async run({}){
						const BingAI=bingAI()
						this.getCookie=async ()=>{
							function getCookiesForURL(url) {
								return new Promise((resolve)=>{
									chrome.cookies.getAll({ url }, (cookies) => {
										resolve(cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '))
									})
								})
							}
							return await getCookiesForURL("https://www.bing.com")
						}
						
						let service=null
						this.consume1=async ({message:question})=>{
							if(!service){
								const cookie=await this.getCookie()
								service=new BingAI({cookie})
							}
							const {text}=await service.sendMessage(question,{variant:"Precise"})
							return {message:text}
						}
					}
				})({helper,name:"bingAI"}),
	openAI:		new (class extends Service{
					async run({openApiKey=OPENAI_API_KEY}){
						this.consume1=async ({message:question})=>{
							if(typeof(openApiKey)=="undefined"){
								new Error("Unknow Error")
							}
							const res=await fetch("https://api.openai.com/v1/chat/completions",{
								method:"POST",
								headers: {
									"Content-Type": "application/json",
									"Authorization": "Bearer " + openApiKey,
								},
								body:JSON.stringify({
									model:"gpt-3.5-turbo",
									messages:[{role:"user", content:question}]
								})
							})
							const {choices:[{message:{content}}], usage:{total_tokens}} = await res.json()
							return {message:content, tokens: total_tokens}
						}
					}
				})({helper, name:"openAI", multithread:true}),
	diffusion:	new (class extends PageService{
					run({}){
						super.run(...arguments)
						const service=diffusion()
						this.consume1=function({message:{args:[prompt]}}){
							return service.generate(prompt)
						}
					}
				})({
					helper,
					name:"diffusion",
					//url:"https://runwayml-stable-diffusion-v1-5.hf.space/",
					async handleResponse(images,ask){
						if(window.isLocal){
							return images
						}
						return await this.batchUpload(images, `temp/diffusion/${ask.session}`)
					}
				})
})