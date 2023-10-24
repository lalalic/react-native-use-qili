import React from "react"
import ProvideWeb from "./provider-web"
import useStateAndLatest from "./useStateAndLatest"
import {parse, generateUUID as uid, asAsyncIterable} from "../tools/text-stream-fetch"


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

export function ChatGptProvider(props){
	const [accessToken, setAccessToken, $accessToken]=useStateAndLatest("")
	const headers=React.useCallback((accessToken)=>({
		"Authorization": "Bearer " + accessToken,
		'accept': 'application/json',
		'x-openai-assistant-app-id': '',
		'content-type': 'application/json',
		'origin': HOST_URL,
		'referrer': CHAT_PAGE,
		['sec-fetch-mode']: 'cors',
		['sec-fetch-site']: 'same-origin',
		'x-requested-with': 'com.chatgpt3auth',
		'user-agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
	}),[])
	return (
		<ProvideWeb
			debug={false}
			uri={CHAT_PAGE}
			Context={Context}
			bro={`
			function bro(){
				let asscessToken=null
				return {
					beatifyLogin(){
						const login=document.querySelector("button[data-testid='login-button']")
						if(login.textContent=="Log in"){
							login.firstElementChild.innerText="登录"
						}
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
				console.log('chatgpt.onServiceReady')
				service.on('load',async ({url, loading})=>{
					console.log({type:"chatgpt.load", url, loading})
					if(url.startsWith(LOGIN_PAGE) && !loading){
						service.beatifyLogin()
					}
					if(service.status()=="authenticated" && !loading && !$accessToken.current){
						const accessToken=await service.getAccessToken()
						console.log('chatgpt.accessToken: '+accessToken)
						setAccessToken(accessToken)
					}
				})

				service.on('navigationStateChange',async ({url,loading})=>{
					console.log({type:"chatgpt.navigationStateChange", url, loading})
					if(url.startsWith(CHAT_PAGE) && loading){
						service.status('authenticated')
						console.log('chatgpt.authenticated')
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
					
					async postMessage(request, opt){
						if(typeof(request)=="string" || Array.isArray(request)){
							request={message:request, options:opt}
						}

						const {
							options:{conversationId:$conversationId, messageId=uid()}={}, 
							message, 
							onAccumulatedResponse, onError}=request
						let conversationId=$conversationId

						const body={
							action: "next",
							messages: [
								{
									id:uid(),
									role:"system",
									content: {
										content_type: "text",
										parts:[
											"Use the following pieces of context to answer the users question.",
											"If you don't know the answer, just say that you don't know, don't try to make up an answer.",
											"2023年10月23日，中共中央政治局委员、外交部长王毅同巴勒斯坦外长马立基通电话。"
										]
									}
								},
								{
									id: uid(),
									role: "user",
									content: {
										content_type: "text",
										parts: [message]
									}
								}
							],
							model: "text-davinci-002-render",
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

						checkStatus(res)
						
						try{
							for await (const chunk of asAsyncIterable(res)) {
								const piece=parse(chunk)
								if(piece){
									if(!conversationId && piece.conversationId)
										conversationId=piece.conversationId

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
						}finally{
							if(conversationId){
								this.removeConversation(conversationId)
							}
						}
					}
				})
			},[])}
			{...props}
			/>
	)
} 

const HOST_URL = 'https://chat.openai.com';
const CHAT_PAGE = `${HOST_URL}/chat`;
const LOGIN_PAGE = `${HOST_URL}/auth/login`;
const LOGOUT_PAGE = `${HOST_URL}/auth/logout`;
const PROMPT_ENDPOINT = `${HOST_URL}/backend-api/conversation`;
const SESSION_PAGE = `${HOST_URL}/api/auth/session`;
