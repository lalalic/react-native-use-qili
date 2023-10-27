import React from "react"
import ProvideWeb from "./provider-web"
import useStateAndLatest from "./useStateAndLatest"
import { parse, generateUUID as uid, asAsyncIterable } from "../tools/text-stream-fetch"
import { useDispatch, useSelector } from "react-redux"

const Context = React.createContext({ status: "initializing", login: null, sendMessage: null })

export function useChatGpt() {
	const { status, service } = React.useContext(Context)
	return React.useMemo(() => {
		return {
			status,
			login() {
				service.login()
			},
			async sendMessage() {
				return await service.sendMessage(...arguments)
			},
			service,
		}
	}, [status, service])
}

export function ChatGptProvider({ children, headers: extraHeaders, ...props }) {
	const [, setAccessToken, $accessToken] = useStateAndLatest("")
	return (
		<ProvideWeb
			debug={false}
			uri={CHAT_PAGE}
			Context={Context}
			webviewStyle={{ marginTop: 50 }}
			broName="chatgptBro"
			bro={`
			/* @babel/ignore */
			function bro(){
				let asscessToken=null
				return {
					beautifyLogin(){
						const login=document.querySelector("button[data-testid='login-button']")
						if(login.textContent=="Log in"){
							login.firstElementChild.innerText="登录"
						}
						//span, h1, a, svg,
						Array.from(document.querySelectorAll("h2,button:not([data-testid='login-button'])"))
							.forEach(a=>a.style.visibility="hidden")
					},
					async getAccessToken(){
						const res=await fetch("${SESSION_PAGE}");
						const data = await res.json()
						return asscessToken=data.accessToken
					},
					login(){
						window.location.replace("${LOGIN_PAGE}")
					},
					logout(){
						window.location.replace("${LOGOUT_PAGE}")
					},

					getArkoseToken(){
						return new Promise((resolve,reject)=>{
							const [textarea, button]=Array.from(document.querySelectorAll('textarea,button[data-testid=send-button]'))
							if(textarea && button){
								textarea.value="hello"
								textarea.dispatchEvent(new Event('input', { bubbles: true}))
								window.fetch=(_fetch=>(url, config)=>{
									try{
										const {arkose_token}=JSON.parse(config.body)
										resolve(arkose_token)
										window.location.replace("${CHAT_PAGE}")
										return {}
									}finally{
										window.fetch=_fetch
									}
								})(window.fetch);
								setTimeout(()=>button.click(), 100)
							}else{
								console.error("textarea || input not exist")
							}
						})
					},

				}
			}
			`}

			onServiceReady={React.useCallback(service => {


				const headers = (accessToken) => {
					return {
						"Authorization": "Bearer " + accessToken,
						'accept': 'application/json',
						'x-openai-assistant-app-id': '',
						'content-type': 'application/json',
						'origin': HOST_URL,
						'referer': CHAT_PAGE,
						['sec-fetch-mode']: 'cors',
						['sec-fetch-site']: 'same-origin',
						'x-requested-with': 'com.chatgpt3auth',
						'user-agent': service.userAgent,
						...extraHeaders,
					}
				}

				service.on('load', async ({ url, loading }) => {
					if (url.startsWith(LOGIN_PAGE) && !loading) {
						service.beautifyLogin()
						setAccessToken("")
						service.show()
					}
					if (service.status() == "authenticated" && !loading && !$accessToken.current) {
						const accessToken = await service.getAccessToken()
						setAccessToken(accessToken)
					}
				})

				service.on('navigationStateChange', async ({ url, loading }) => {
					console.log({ type: "chatgpt.navigationStateChange", url, loading })
					if (url.startsWith(CHAT_PAGE) && loading && !$accessToken.current) {
						service.status('authenticated')
						console.log('chatgpt.authenticated')
					}

					if (url.startsWith(LOGOUT_PAGE) && loading) {
						service.status('logged-out')
					}
				})

				service.extend({
					async removeConversation(conversationId) {
						const res = await fetch(`${PROMPT_ENDPOINT}/${conversationId}`, {
							method: "PATCH",
							headers: headers($accessToken.current),
							body: JSON.stringify({
								is_visible: false
							})
						})

						return await res.json()
					},

					async genTitle(conversationId) {
						const res = await fetch(`${PROMPT_ENDPOINT}/gen_title/${conversationId}`, {
							method: "POST",
							headers: await headers($accessToken.current),
							body: JSON.stringify({
								is_visible: false
							})
						})

						return (await res.json())?.title
					},

					async sendMessage(request, opt) {
						if (typeof (request) == "string" || Array.isArray(request)) {
							request = { message: request, options: opt }
						}

						const {
							options: { conversationId, messageId = uid(), model = "text-davinci-002-render" } = {},
							message,
							onAccumulatedResponse, onError } = request

						const body = {
							action: "next",
							messages: makeMessage(message),
							model: model,
							conversation_id: conversationId,
							parent_message_id: messageId,
							arkose_token: await service.getArkoseToken(),
						}
						const currentHeaders = headers($accessToken.current)
						const res = await fetch(PROMPT_ENDPOINT, {
							method: "POST",
							headers: currentHeaders,
							body: JSON.stringify(body)
						})
						let newConversationId
						try {
							for await (const chunk of asAsyncIterable(res)) {
								const piece = parse(chunk)
								if (piece) {
									if (piece.conversationId) {
										newConversationId = piece.conversationId
									}
									if (piece.error) {
										onError?.(piece.error)
										return piece
									} else {
										onAccumulatedResponse?.(piece)
									}

									if (piece.isDone) {
										return piece
									}
								}
							}
						} catch (e) {
							switch (e.message) {
								case "SessionExpired":
									service.logout()
									break
							}
						} finally {
							if (newConversationId) {
								this.removeConversation(newConversationId)
							}
						}
					}
				})
			}, [])}
			{...props}
		>
			{children}
			<ClearChatGPTUnused />
		</ProvideWeb>
	)
}

const HOST_URL = 'https://chat.openai.com';
const CHAT_PAGE = `${HOST_URL}/chat`;
const LOGIN_PAGE = `${HOST_URL}/auth/login`;
const LOGOUT_PAGE = `${HOST_URL}/auth/logout`;
const PROMPT_ENDPOINT = `${HOST_URL}/backend-api/conversation`;
const SESSION_PAGE = `${HOST_URL}/api/auth/session`;

function makeMessage(message) {
	if (typeof (message) == "string") {
		message = [{ content: message }]
	}

	return message.map(({ role = "user", content }) => ({
		id: uid(),
		author: { role },
		content: {
			content_type: "text",
			parts: Array.isArray(content) ? content : [content]
		},
		metadata: {}
	}))
}

function ClearChatGPTUnused() {
	const dispatch = useDispatch()
	const { service, status } = useChatGpt()
	const accessToken = React.useMemo(async () => {
		if (status == "authenticated") {
			return await service.getAccessToken()
		}
		return ""
	}, [status])
	const [conversationId] = useSelector(state => state.my.queue?.chatgpt) || []
	React.useEffect(() => {
		if (status == "authenticated" && conversationId && accessToken) {
			(async () => {
				service.removeConversation(conversationId)
				dispatch({ type: "my/queue", queue: "chatgpt", item: conversationId, done: true })
			})();
		}
	}, [status, accessToken, conversationId])
	return null
}

/**
 * a way to get arkose-token enforcement, but don't know how to generate token
				function observeScriptElementCreation(callback) {
					const observer = new MutationObserver((mutationsList) => {
						for (const mutation of mutationsList) {
							if (mutation.type === 'childList' && mutation.addedNodes) {
								for (const node of mutation.addedNodes) {
									if (node instanceof HTMLScriptElement) {
										callback(node, observer);
									}
								}
							}
						}
					});
				
					const config = { childList: true, subtree: true };
					observer.observe(document, config)
				}

				observeScriptElementCreation((scriptElement, observer) => {
					if(scriptElement.src.endsWith("api.js")){
						window.useArkoseSetupEnforcementgpt35=(fx=>function (enforcement){
							enforcement.setConfig=(_fx0=>function(config){
								debugger
								return _fx0.call(enforcement, {
									...config,
									onCompleted(a){
										config.onCompleted(...arguments)
										arkoseTokenTrigger.resolve?.(a.token)
									}
								})
							})(enforcement.setConfig);

							fx(window.enforcement=arkoseTokenTrigger.enforcement=enforcement)
						})(window.useArkoseSetupEnforcementgpt35);
						observer.disconnect();
					}
				});

////////////a way to post message from web without arkose_token hacking, intercept fetch

					async sendMessage2(request, opt){
						if (typeof (request) == "string" || Array.isArray(request)) {
							request = { message: request, options: opt }
						}
						const messages=makeMessage(request.message)
						const res=await service.postMessage(messages)
						if(res?.conversationId){
							this.removeConversation(res.conversationId)
							delete res.conversationId
							service["window.location.replace"](CHAT_PAGE)
						}
						return res
					},

				async postMessage(message){
					return new Promise((resolve,reject)=>{
						const [textarea, button]=Array.from(document.querySelectorAll('textarea,button[data-testid=send-button]'))
						if(textarea && button){
							textarea.value=typeof(message)=="string" ? message : message.find(a=>a.author.role=="user")?.content.parts.join("\\n")
							textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable:true}))
							window.fetch=(_fetch=>async (url, config)=>{
								try{
									if(Array.isArray(message)){
										const body=JSON.parse(config.body)
										body.messages=message
										config.body=JSON.stringify(body)
									}

									const res=await _fetch(url, config)
									const reader=res.body.getReader()

									res.body.getReader=function(){
										let done=false
										reader.read=(fx=>async function(){
											const piece=await fx.apply(reader)
											try{
												const a=parse(new TextDecoder().decode(piece.value))
												if(a?.isDone || piece.done){
													if(!done){
														resolve(a)
														done=true
													}
												}
											}catch(e){

											}
											return piece
										})(reader.read);

										return reader
									}
									return res
									
								}finally{
									window.fetch=_fetch
								}
							})(window.fetch);
							setTimeout(()=>button.click(), 300)
						}else{
							reject("textarea || input not exist")
						}
					})
				},
				function escapeRegExp(string) {
					return string.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
				}
				
				function replaceAll(str, find, replace) {
					return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
				}
				function parse(data) {
					const chunks = data.split("data: ");

					const sanitizedChunks = chunks
						.map(c => replaceAll(c, "\\n", ""))
						.filter(c => !!c && c !== "[DONE]");

					if (!sanitizedChunks.length) {
						return null;
					}
					
					for (let i = sanitizedChunks.length - 1; i > -1; i--) {
						try {
							const response = JSON.parse(sanitizedChunks[i]);
							return {
								message: response.message.content.parts[0],
								messageId: response.message.id,
								conversationId: response.conversation_id,
								isDone: response.message?.end_turn === true,
							};
						} catch (e) { }
					}
				}

				async function* asAsyncIterable(response) {
					checkStatus(response)
				
					if(response.body){
						const reader = response.body.getReader()
						try {
							while (true) {
								const { done, value } = await reader.read()
								if (done) {
									return
								}
								yield new TextDecoder().decode(value)
							}
						} finally {
							reader.releaseLock()
						}
					}else{
						yield await response.text()
					}
				}
 
*/
