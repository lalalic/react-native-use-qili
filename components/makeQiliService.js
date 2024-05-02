import * as FileSystem from "expo-file-system";
import prepareFolder from "./prepareFolder";
import { SubscriptionClient } from "subscriptions-transport-ws";

export default function makeQiliService(getSession) {
	if(!'QiliConf' in globalThis){
		throw new Error(`Please useQili to configure Qili service first.`)
	}

	let QiliConf=globalThis.QiliConf

	const factory=({api, apiKey, headers:globalHeaders})=>({
		service: api,
		storage: "https://up.qbox.me",
		async fetch(request, headers=globalHeaders, timeout=60000) {
			if(typeof(arguments[1])=="number"){
				timeout=headers
				headers=globalHeaders
			}
			headers=headers||{...getSession(),}
			const timer=setTimeout(()=>{
				throw new Error('Timeout from qili service')
			},timeout)
			const res = await fetch(this.service, {
				method: "POST",
				headers: {
					'Content-Type': 'application/json',
					"x-application-id": apiKey,
					...headers,
				},
				body: request instanceof FormData ? request : JSON.stringify(request)
			});
			const { data, errors } = await res.json();
			clearTimeout(timer)

			if (!data) {
				throw new Error(res.statusText);
			}

			if (errors) {
				throw new Error(errors);
			}

			return data;
		},
		async upload({ file, key, host }, admin) {
			const { token: parameters } = await this.fetch({
				id: "file_token_Query",
				variables: { key, host }
			}, admin);
			await prepareFolder(file);
			const res = await FileSystem.uploadAsync(this.storage, file, {
				uploadType: FileSystem.FileSystemUploadType.MULTIPART,
				fieldName: "file",
				parameters
			});

			const { data, error } = JSON.parse(res.body);

			if (error) {
				throw new Error(error);
			}

			if (!data) {
				throw new Error(res.statusText);
			}

			return data?.file_create?.url;
		},
		async getUser(fields=[]){
			const data=await this.fetch({query:`query{me{id\n${fields.join("\n")}}}`})
			data.me.id=data.me.id.split(":").pop()
			return data.me
		},
		subscribe(request, callback, headers=globalHeaders) {
			headers=headers||{...getSession(),}
			const url = this.service.replace(/^http/, "ws").replace(/graphql$/,"websocket");
			//@Why: a shared client can't work, is it because close method is changed ???
			const client = new SubscriptionClient(url, {
				reconnect: true,
				connectionParams: {
					"x-application-id": apiKey,
					...headers,
					request: {
						id: request.id,
						variables: request.variables
					},
				},
				connectionCallback(errors) {
					if (errors) {
						callback?.({ errors });
					}
				}
			});

			const sub = client.request({ query: "*", ...request }).subscribe(
				function onNext(data) {
					callback?.(data);
				},
				function onError(errors) {
					callback?.({ errors });
				}
			);

			return () => {
				sub.unsubscribe();
				client.close();
				console.log(`subscription for ${request.id} closed`)
			};
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
	})

	const Qili=factory(QiliConf)

	let bridge={...Qili}

	if(QiliConf.bridge){
		const {api=QiliConf.api, apiKey="bridge", accessToken}=QiliConf.bridge
		bridge=factory({api, apiKey, headers:{"x-application-id":apiKey, "x-access-token":accessToken}})	
	}

	bridge.askThenWaitAnswer=function(ask, timeout) {
		return new Promise((resolve, reject) => {
			const unsub = this.subscribe({
				id: "askThenWaitAnswer",
				query: `subscription a($message:JSON!){
						askThenWaitAnswer(message:$message)
				}`,
				variables: { message: ask }
			}, ({ data, errors }) => {
					unsub();
					if (errors) {
						console.error(errors);
						reject(new Error("Your request can't be processed now."));
					} else {
						resolve(data.askThenWaitAnswer);
					  }
				})
		})
	}

	
	Object.defineProperties(Qili, {
		bridge:{
			value: bridge
		}
	})

	return Qili
}
