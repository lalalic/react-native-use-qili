
import uuid from 'react-native-uuid';
import makeQiliService from "./components/makeQiliService";


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

export const Qili=makeQiliService(getSession)

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

export function hasChatGPTAccount(state){
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