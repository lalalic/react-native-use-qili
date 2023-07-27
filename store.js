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
import Loading from "./components/Loading"


export function myReducer(state = {
        sessions:{}, 
        uuid:uuid.v4(), 
        i:0, 
        since:Date.now(),
        admin:false,
        widgets:{chatgpt:false},
        webviewservices:{},
    }, action) {
    switch (action.type) {
        case "my/session":
            return {...state, sessions:{...state.sessions, ...action.payload}}
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


export function createStore({reducers:extendReducers,storage, listeners=[]}){
	const reducers={
		my:myReducer,
		...extendReducers,
	}

	const listener=createListenerMiddleware()
	listeners.forEach(fx=>listener.startListening(fx))
	const store = globalThis.store=configureStore({
		/** reducer can't directly change any object in state, instead shallow copy and change */
		reducer:
			persistReducer(
				{key:"root",version:1,blacklist:[],storage},
				combineReducers(reducers)
			),

		middleware: (getDefaultMiddleware) =>getDefaultMiddleware({
				serializableCheck:{
					ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
					isSerializable(value){
						return isPlain(value)||value?.constructor===Date
					}
				},
				immutableCheck:{
					warnAfter:100,
				},
			}).prepend([listener.middleware]),
	})

	setupListeners(store.dispatch)
	return {store, persistor:persistStore(store)}
}

export const Provider=({children, onReady, loading=<Loading/>, init, listeners, reducers, storage=ExpoFileSystemStorage})=>{
	const {store, persistor}=React.useMemo(()=>{
		const data=createStore({reducers, storage, listeners})
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