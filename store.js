import React from "react"
import uuid from 'react-native-uuid';
import { combineReducers } from "redux"
import { configureStore, isPlain, createListenerMiddleware } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import ExpoFileSystemStorage from "redux-persist-expo-filesystem"

import { Provider as ReduxProvider} from "react-redux"
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore,persistReducer, FLUSH,REHYDRATE,PAUSE,PERSIST,PURGE,REGISTER } from 'redux-persist'
import makeQiliService from "./components/makeQiliService";
import { produce } from "immer"
import Loading from "./components/Loading"


export function myReducer(state = {
        sessions:{}, 
        uuid:uuid.v4(), 
        i:0, 
        since:Date.now(),
        admin:false,
        widgets:{chatgpt:false},
        webviewservices:{},
		queue:{}
    }, action) {
    switch (action.type) {
        case "my/session":{
			return produce(state, $state=>{
				const {payload:sessions}=action
				Object.keys(sessions).forEach(k=>{
					const session=sessions[k]
					if(!session){
						delete $state.sessions[k]
					}else if($state.sessions[k]){
						$state.sessions[k]={...$state.sessions[k], ...session}
					}else{
						$state.sessions[k]=session
					}
				})
			})
		}
		case "my/queue":
			return produce(state, $state=>{
				const {queue, item, done}=action
				const a=($state.queue=$state.queue||{});
				const theQueue=(a[queue]=a[queue]||[])
				if(done){
					const i=theQueue.indexOf(item)
					if(i!=-1){
						theQueue.splice(i,1)
					}
				}else{
					theQueue.push(item)
				}
				
			})
        case "my":
            return {...state, ...action.payload}
    }
    return state
}

export async function isAdmin(state=globalThis.store.getState()){
	if(isUserLogin(state)){
		const data=await Qili.fetch({
			query:"query{isAdmin}"
		},state.my.admin)
		return data.isAdmin
	}
	return false
}

export function isAlreadyFamiliar(state){
	return state.my.i>1000
}

export function hasChatGPTAccount(state=globalThis.store.getState()){
	return !!state.my.widgets?.chatgpt
}

export function isUserLogin(state){
	return !!state.my.admin?.headers
}

export function needLogin(state){
	return !isUserLogin(state) && state.my.requireLogin
}

export function getSession(){
	const {my:{admin}}=globalThis.store.getState()
	return admin?.headers
}

export const Qili=makeQiliService(getSession)
export const Reset={type:"$/delete/account"}

export function createStore({reducers:extendReducers,storage, middlewares=[], listeners=[], serializableCheckIgnoreActions=[]}){
	function resetify(reducers){
		for(let [key,reducer] of Object.entries(reducers)){
			reducers[key]=function(state,action){
				if(action.type==Reset.type){
					return reducer(undefined, {})
				}
				return reducer(state, action)
			}
		}
		return reducers
	}

	const reducers=resetify({
		my:myReducer,
		...extendReducers,
	})

	const listener=createListenerMiddleware()
	listeners.forEach(fx=>listener.startListening(fx))
	listener.startListening({
        type:"my/session",
        async effect(action, api){
            const [id]=Object.keys(action.payload)
            const {my:{sessions:{[id]:current}}}=api.getState()
            const {my:{sessions:{[id]:old}}}=api.getOriginalState()
            if(old?.conversationId && old.conversationId!=current?.conversationId){
                api.dispatch({type:"my/queue", queue:"chatgpt", item:old.conversationId})
            }
        }
    },)

	const store = globalThis.store=configureStore({
		/** reducer can't directly change any object in state, instead shallow copy and change */
		reducer:
			persistReducer(
				{key:"root",version:1,blacklist:[],storage},
				combineReducers(reducers)
			),

		middleware: (getDefaultMiddleware) =>getDefaultMiddleware({
				serializableCheck:{
					ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, ...serializableCheckIgnoreActions],
					isSerializable(value){
						return isPlain(value)||value?.constructor===Date
					}
				},
				immutableCheck:{
					warnAfter:100,
				},
			}).prepend([...middlewares, listener.middleware]),
	})

	setupListeners(store.dispatch)
	return {store, persistor:persistStore(store)}
}

export const Provider=({children, onReady, loading=<Loading/>, init, serializableCheckIgnoreActions,
	middlewares, listeners, reducers, storage=ExpoFileSystemStorage})=>{
	const {store, persistor}=React.useMemo(()=>{
		const data=createStore({reducers, storage, listeners, middlewares, serializableCheckIgnoreActions})
		const unsub=data.store.subscribe(async ()=>{
			unsub()
			await init?.(data.store)
			onReady?.()
		})

		return data
	},[])
	return (
		<ReduxProvider store={store}>
			<PersistGate {...{loading, persistor}}>
				{children}
			</PersistGate>
		</ReduxProvider>
	)
}