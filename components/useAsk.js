import React from 'react';
import { Qili } from "../store";


function useCloudPredict({message:defaultQuestion, chatflow:defaultChatFlow, timeout:defaultTimeout}={}) {
    const ask=React.useCallback(async (info = defaultQuestion, chatflow=defaultChatFlow, timeout=defaultTimeout) => {
        const config={}
        if(typeof(info)=="string"){
            info={message:info}
        }

        const {options, message, onError=console.error, onAccumulatedResponse, history}=info

        config.question=message
        config.history=history?.map(({text,user:{_id}})=>({message:text, type:`${_id=="user" ? "user" : "api"}Message`}))

        try{
            const data=await Qili.fetch({
                query:`query($chatflow:String, $config:JSON!){
                    predict(chatflow:$chatflow, config:$config)
                }`,
                variables:{
                    chatflow, 
                    config
                }
            }, timeout)


            const result= data.predict

            if(onAccumulatedResponse){
                onAccumulatedResponse({isDone:true, message:result})
            }
            
            return result
        }catch(e){
            onError?.(e)
        }

    }, []);

    return ask
}

module.exports=useCloudPredict