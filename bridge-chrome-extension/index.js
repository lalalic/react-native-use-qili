
			// src/bing-chat.ts
//import crypto from "node:crypto";
//import WebSocket from "ws";

function bingAI(){
  
  //node:crypto
  const crypto={
    randomBytes(size){
			const randomBytes = new Uint8Array(size);
			for (let i = 0; i < size; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
			return {
				toString(){
					return Array.from(randomBytes, byte => ('0' + byte.toString(16)).slice(-2)).join('');
				}
			}
		},
		randomUUID(){
			const uuidFormat = [
				crypto.randomBytes(4).toString("hex"),
				crypto.randomBytes(2).toString("hex"),
				crypto.randomBytes(2).toString("hex"),
				crypto.randomBytes(2).toString("hex"),
				crypto.randomBytes(6).toString("hex"),
			];
			return uuidFormat.join('-');
		}
  }
  //ws

  const WebSocket=(()=>{
    if(globalThis.WebSocket.on){
      return globalThis.WebSocket
    }
    
    return class extends globalThis.WebSocket{
        constructor(url){
          super(url)
          this._listeners=[]
        }
        on(eventName, fx, fn){
          this.addEventListener(eventName,fn=event=>{
            switch(eventName){
              case 'error':
                return fx(event.error)
              case 'message':
                return fx(event.data)
              default:
                return fx(event)
            }
          })
          this._listeners.push([eventName, fn])
        }
        removeAllListeners(){
          this._listeners.forEach(a=>this.removeEventListener(...a))
          this._listeners=[]
        }
      }
    }
)();

  // src/fetch.ts
  var fetch = globalThis.fetch;
  if (typeof fetch !== "function") {
    throw new Error("Invalid environment: global fetch not defined");
  }

  // src/bing-chat.ts
  var terminalChar = "";
  var BingChat = class {
    constructor(opts) {
      const { cookie, debug = false } = opts;
      this._cookie = cookie;
      this._debug = !!debug;
      if (!this._cookie) {
        throw new Error("Bing cookie is required");
      }
    }
    /**
     * Sends a message to Bing Chat, waits for the response to resolve, and returns
     * the response.
     *
     * If you want to receive a stream of partial responses, use `opts.onProgress`.
     *
     * @param message - The prompt message to send
     * @param opts.conversationId - Optional ID of a conversation to continue (defaults to a random UUID)
     * @param opts.onProgress - Optional callback which will be invoked every time the partial response is updated
     *
     * @returns The response from Bing Chat
     */
    async sendMessage(text, opts = {}) {
      const {
        invocationId = "1",
        onProgress,
        locale = "en-US",
        market = "en-US",
        region = "US",
        location,
        messageType = "Chat",
        variant = "Balanced"
      } = opts;
      let { conversationId, clientId, conversationSignature } = opts;
      const isStartOfSession = !(conversationId && clientId && conversationSignature);
      if (isStartOfSession) {
        const conversation = await this.createConversation();
        conversationId = conversation.conversationId;
        clientId = conversation.clientId;
        conversationSignature = conversation.conversationSignature;
      }
      const result = {
        author: "bot",
        id: crypto.randomUUID(),
        conversationId,
        clientId,
        conversationSignature,
        invocationId: `${parseInt(invocationId, 10) + 1}`,
        text: ""
      };
      const responseP = new Promise(
        async (resolve, reject) => {
          const chatWebsocketUrl = "wss://sydney.bing.com/sydney/ChatHub";
          const ws = new WebSocket(chatWebsocketUrl,{
            perMessageDeflate: false,
            headers: {
              'accept-language': 'en-US,en;q=0.9',
              'cache-control': 'no-cache',
              pragma: 'no-cache',
              origin: "https://www.bing.com",
            }
          })
          let isFulfilled = false;
          function cleanup() {
            ws.close();
            ws.removeAllListeners();
          }
          ws.on("error", (error) => {
            console.warn("WebSocket error:", error);
            cleanup();
            if (!isFulfilled) {
              isFulfilled = true;
              reject(new Error(`WebSocket error: ${error.toString()}`));
            }
          });
          ws.on("close", () => {
          });
          ws.on("open", () => {
            ws.send(`{"protocol":"json","version":1}${terminalChar}`);
          });
          let stage = 0;
          ws.on("message", (data) => {
            var _a, _b;
            const objects = data.toString().split(terminalChar);
            const messages = objects.map((object) => {
              try {
                return JSON.parse(object);
              } catch (error) {
                return object;
              }
            }).filter(Boolean);
            if (!messages.length) {
              return;
            }
            if (stage === 0) {
              ws.send(`{"type":6}${terminalChar}`);
              const traceId = crypto.randomBytes(16).toString("hex");
              const locationStr = location ? `lat:${location.lat};long:${location.lng};re=${location.re || "1000m"};` : void 0;
              const optionsSets = [
                "nlu_direct_response_filter",
                "deepleo",
                "enable_debug_commands",
                "disable_emoji_spoken_text",
                "responsible_ai_policy_235",
                "enablemm"
              ];
              if (variant == "Balanced") {
                optionsSets.push("galileo");
              } else {
                optionsSets.push("clgalileo");
                if (variant == "Creative") {
                  optionsSets.push("h3imaginative");
                } else if (variant == "Precise") {
                  optionsSets.push("h3precise");
                }
              }
              const params = {
                arguments: [
                  {
                    source: "cib",
                    optionsSets,
                    allowedMessageTypes: [
                      "Chat",
                      "InternalSearchQuery",
                      "InternalSearchResult",
                      "InternalLoaderMessage",
                      "RenderCardRequest",
                      "AdsQuery",
                      "SemanticSerp"
                    ],
                    sliceIds: [],
                    traceId,
                    isStartOfSession,
                    message: {
                      locale,
                      market,
                      region,
                      location: locationStr,
                      author: "user",
                      inputMethod: "Keyboard",
                      messageType,
                      text
                    },
                    conversationSignature,
                    participant: { id: clientId },
                    conversationId
                  }
                ],
                invocationId,
                target: "chat",
                type: 4
              };
              if (this._debug) {
                console.log(chatWebsocketUrl, JSON.stringify(params, null, 2));
              }
              ws.send(`${JSON.stringify(params)}${terminalChar}`);
              ++stage;
              return;
            }
            for (const message of messages) {
              if (message.type === 1) {
                const update = message;
                const msg = (_a = update.arguments[0].messages) == null ? void 0 : _a[0];
                if (!msg)
                  continue;
                if (!msg.messageType) {
                  result.author = msg.author;
                  result.text = msg.text;
                  result.detail = msg;
                  onProgress == null ? void 0 : onProgress(result);
                }
              } else if (message.type === 2) {
                const response = message;
                if (this._debug) {
                  console.log("RESPONSE", JSON.stringify(response, null, 2));
                }
                const validMessages = (_b = response.item.messages) == null ? void 0 : _b.filter(
                  (m) => !m.messageType
                );
                const lastMessage = validMessages == null ? void 0 : validMessages[(validMessages == null ? void 0 : validMessages.length) - 1];
                if (lastMessage) {
                  result.conversationId = response.item.conversationId;
                  result.conversationExpiryTime = response.item.conversationExpiryTime;
                  result.author = lastMessage.author;
                  result.text = lastMessage.text;
                  result.detail = lastMessage;
                  if (!isFulfilled) {
                    isFulfilled = true;
                    resolve(result);
                  }
                }
              } else if (message.type === 3) {
                if (!isFulfilled) {
                  isFulfilled = true;
                  resolve(result);
                }
                cleanup();
                return;
              } else {
              }
            }
          });
        }
      );
      return responseP;
    }
    async createConversation() {
      const requestId = crypto.randomUUID();
      const cookie = this._cookie.includes(";") ? this._cookie : `_U=${this._cookie}`;
      return fetch("https://www.bing.com/turing/conversation/create", {
        headers: {
          accept: "application/json",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "sec-ch-ua": '"Not_A Brand";v="99", "Microsoft Edge";v="109", "Chromium";v="109"',
          "sec-ch-ua-arch": '"x86"',
          "sec-ch-ua-bitness": '"64"',
          "sec-ch-ua-full-version": '"109.0.1518.78"',
          "sec-ch-ua-full-version-list": '"Not_A Brand";v="99.0.0.0", "Microsoft Edge";v="109.0.1518.78", "Chromium";v="109.0.5414.120"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-model": "",
          "sec-ch-ua-platform": '"macOS"',
          "sec-ch-ua-platform-version": '"12.6.0"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-edge-shopping-flag": "1",
          "x-ms-client-request-id": requestId,
          "x-ms-useragent": "azsdk-js-api-client-factory/1.0.0-beta.1 core-rest-pipeline/1.10.0 OS/MacIntel",
          cookie
        },
        referrer: "https://www.bing.com/search",
        referrerPolicy: "origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include"
      }).then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error(
            `unexpected HTTP error createConversation ${res.status}: ${res.statusText}`
          );
        }
      });
    }
  };
  return globalThis.BingChat=BingChat
}

function diffusion(){
    const session_hash=Math.random().toString(36).substring(2)
    const hash={session_hash,fn_index: 2}
    return {
        generate(prompt){
            return new Promise((resolve,reject)=>{
                const ws=new WebSocket("wss://runwayml-stable-diffusion-v1-5.hf.space/queue/join")
                

                ws.onmessage=function(event){
                    const {msg, output} = JSON.parse(event.data);
                    switch (msg) {
                    case "send_data":
                        ws.send(JSON.stringify({
                            ...hash,
                            data:[prompt],
                        }))
                        break;
                    case "send_hash":
                        ws.send(JSON.stringify(hash));
                        break;
                    case "process_completed":
                        resolve(output.data[0])
                        return;
                    case "queue_full":
                        return;
                    case "estimation":
                        break;
                    case "process_generating":
                        break;
                    case "process_starts":
                        break
                    }
                }
            })
        },

        async dalle(prompt,{size="1024x1024", openApiKey=OPENAI_API_KEY}={}){
            const res=await fetch("https://api.openai.com/v1/images/generations",{
                method:"POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + openApiKey,
                },
                body:JSON.stringify({
                    prompt,
                    n:1,
                    size
                })
            })
            try{
                const data=await res.json()
                const {data:[{url}]} = data
                return {message:url, tokens: 100}
            }catch(e){
                return {message:"error: "+e.message, tokens: 1}
            }
        }
    }
}

diffusion.accessible="https://runwayml-stable-diffusion-v1-5.hf.space/"
			exports.uris={
				
			}
			exports.services={
				bingAI,
diffusion
			}

			exports.subscriptAsHelper=function({helper, chrome, window, Qili}){
				
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


		function makeMessage(message){
			if(typeof(message)=="string"){
				message=[{content:message}]
			}

			return message.map(({role="user", content})=>({
				id:uid(), 
				role, 
				content:{
					content_type:"text", 
					parts:Array.isArray(content) ? content : [content]
				}
			}))
		}

		this.consume1=async function consume1({message}) {
			const res = await fetch("https://chat.openai.com/backend-api/conversation", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": "Bearer " + (await me.getToken()),
					},
					body: JSON.stringify({
							action: "next",
							messages: makeMessage(message?.message||message),
							model: "text-davinci-002-render",
							parent_message_id: uid(),
					})
			})
			const response=await this.read(res.body)
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

const unsub=subscribe({helper},window.bros={
	autoAI: 	new (class extends Service{
					run(){
						this.apis=["chatgpt", "openAI"]
						this.printAPI=()=>console.log(`AutoAI: ${this.apis.join(" -> ")}`)
						this.consume1=async function(){
							let errors=[]
							for(let service of this.apis){
								try{
									const res=await window.bros[service]?.consume1(...arguments)
									if(!res?.message){
										continue
									}
									if(errors)
										console.warn(errors.join("\n"))
									return {service, ...res}
								}catch(e){
									errors.push(`[${service}] : ${e.message}`)
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
	openAI:		new (class extends Service{
					async run({openApiKey=OPENAI_API_KEY}){
						function makeMessage(message){
							if(typeof(message)=="string"){
								message=[{role:"user", content:message}]
							}
				
							return message
						}

						this.consume1=async ({message})=>{
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
									messages: makeMessage(message?.message||message)
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
				}),
	
})
				return unsub
			}
		