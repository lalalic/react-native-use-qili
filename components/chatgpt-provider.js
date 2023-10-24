import React from "react"
import ProvideWeb from "./provider-web"
import useStateAndLatest from "./useStateAndLatest"
import {parse, generateUUID as uid, asAsyncIterable} from "../tools/text-stream-fetch"
import { useDispatch, useSelector } from "react-redux"

const Context=React.createContext({status:"initializing", login:null, sendMessage:null})

export function useChatGpt(){
	const {status, service}=React.useContext(Context)
	return React.useMemo(()=>{
		return {
			status, 
			login(){
				service.login()
			},
			async sendMessage(){
				return await service.sendMessage(...arguments)
			},
			service,
		}
	},[status, service])
}

export function ChatGptProvider({children, headers:extraHeaders, ...props}){
	const [, setAccessToken, $accessToken]=useStateAndLatest("")
	return (
		<ProvideWeb
			debug={false}
			uri={CHAT_PAGE}
			Context={Context}
			webviewStyle={{marginTop:50}}
			bro={`
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
					}
				}
			}			
			`}
			onServiceReady={React.useCallback(service=>{
				const headers=accessToken=>({
					"Authorization": "Bearer " + accessToken,
					'accept': 'application/json',
					'x-openai-assistant-app-id': '',
					'content-type': 'application/json',
					'origin': HOST_URL,
					'referrer': CHAT_PAGE,
					['sec-fetch-mode']: 'cors',
					['sec-fetch-site']: 'same-origin',
					'x-requested-with': 'com.chatgpt3auth',
					'user-agent': service.userAgent,
					...extraHeaders,
				})

				service.on('load',async ({url, loading})=>{
					if(url.startsWith(LOGIN_PAGE) && !loading){
						service.beautifyLogin()
						setAccessToken("")
						service.show()
					}
					if(service.status()=="authenticated" && !loading && !$accessToken.current){
						const accessToken=await service.getAccessToken()
						setAccessToken(accessToken)
					}
				})

				service.on('navigationStateChange',async ({url,loading})=>{
					console.log({type:"chatgpt.navigationStateChange", url, loading})
					if(url.startsWith(CHAT_PAGE) && loading){
						service.status('authenticated')
						console.log('chatgpt.authenticated')
					}

					if(url.startsWith(LOGOUT_PAGE) && loading){
						service.status('logged-out')
					}
				})

				service.extend({
					async removeConversation(conversationId){
						const res=await fetch(`${PROMPT_ENDPOINT}/${conversationId}`,{
							method:"PATCH",
							headers: headers($accessToken.current),
							body: JSON.stringify({
								is_visible:false
							})
						})
			
						return await res.json()
					},

					async genTitle(conversationId){
						const res=await fetch(`${PROMPT_ENDPOINT}/gen_title/${conversationId}`,{
							method:"POST",
							headers: headers($accessToken.current),
							body: JSON.stringify({
								is_visible:false
							})
						})
			
						return (await res.json())?.title
					},
					
					async sendMessage(request, opt){
						if(typeof(request)=="string" || Array.isArray(request)){
							request={message:request, options:opt}
						}

						const {
							options:{conversationId, messageId=uid(), model="text-davinci-002-render"}={}, 
							message, 
							onAccumulatedResponse, onError}=request
						
						const body={
							action: "next",
							messages: makeMessage(message),
							model: model,
							conversationId,
							parent_message_id: messageId,
						}
						if(conversationId)
							body.conversationId=conversationId
						const res = await fetch(PROMPT_ENDPOINT, {
							method: "POST",
							headers:headers($accessToken.current),
							body: JSON.stringify(body)
						})
						
						try{
							for await (const chunk of asAsyncIterable(res)) {
								const piece=parse(chunk)
								if(piece){
									if(piece.error){
										onError?.(piece.error)
										return piece
									}else{
										onAccumulatedResponse?.(piece)
									}
									
									if(piece.isDone ){
										return piece
									}
								}
							}
						}catch(e){
							switch(e.message){
								case "SessionExpired":
									service.logout()
								break
							}
						}
					}
				})
			},[])}
			{...props}
			>
			{children}
			<ClearChatGPTUnused/>
		</ProvideWeb>
	)
} 

const HOST_URL = 'https://chat.openai.com';
const CHAT_PAGE = `${HOST_URL}/chat`;
const LOGIN_PAGE = `${HOST_URL}/auth/login`;
const LOGOUT_PAGE = `${HOST_URL}/auth/logout`;
const PROMPT_ENDPOINT = `${HOST_URL}/backend-api/conversation`;
const SESSION_PAGE = `${HOST_URL}/api/auth/session`;

function makeMessage(message){
	if(typeof(message)=="string"){
		message=[{content:"message"}]
	}

	return message.map(({role="user", content})=>({id:uid(), role, content:{content_type:"text", parts:Array.isArray(content) ? content : [content]}}))
}

function ClearChatGPTUnused(){
    const dispatch=useDispatch()
	const {service, status}=useChatGpt()
	const accessToken=React.useMemo(async ()=>{
		if(status=="authenticated"){
			return await service.getAccessToken()
		}
		return ""
	},[status])
    const [conversationId]=useSelector(state=>state.my.queue?.chatgpt)||[]
    React.useEffect(()=>{
        if(status="authenticated" && conversationId && accessToken){
			(async()=>{
				await service.removeConversation(conversationId)
				dispatch({type:"wechat/chatgpt/remove", conversationId, done:true})
			})();
        }
    },[status,accessToken,conversationId])
	return null
}