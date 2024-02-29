const proxy=require('react-native-use-qili/cloud/graphql-proxy')
module.exports=({apiKey, chatflows, chatflowId:defaultChatflowId=chatflows?.chain})=>proxy(proxyFx=>({
    name:"predict",
    apiKey, 
    appKey:"ai",
    typeDefs:`
        extend type Query{
            predict(chatflow:String, config:JSON!):JSON
        }
        extend type Mutation{
            uploadDocument(metadata:JSON!):Boolean
            removeDocument(metadata:JSON!):Boolean
        }
    `,
    resolver:{
        Query:{
            async predict(_, { chatflow=defaultChatflowId, config={} }, ctx){
                if(config.overrideConfig?.indexName){
                    config.overrideConfig.indexName=`${ctx.app.app.apiKey}/${ctx.user._id}/${config.overrideConfig.indexName}`
                }
                const prediction=await fetch(`https://ai.qili2.com/api/v1/prediction/${chatflows?.[chatflow]||chatflow}`,
                    {
                        method:"post",
                        headers:{
                            "Content-Type":"application/json",
                            "Authorization":"Bearer "+apiKey
                        },
                        body: JSON.stringify(config)
                    }
                )
                return await prediction.json()
            }
        },
        Mutation:{
            uploadDocument(_,variables, ctx){
                variables.metadata=Object.assign(variables.metadata,{
                    chatflowId:chatflows?.assistant || defaultChatflowId,
                    id:`${ctx.app.app.apiKey}/${ctx.user._id}/${variables.metadata.id}`
                })
                return proxyFx("uploadDocument")(...arguments)
            },
            removeDocument(_,variables, ctx){
                variables.metadata=Object.assign(variables.metadata,{
                    chatflowId:chatflows?.assistant || defaultChatflowId,
                    id:`${ctx.app.app.apiKey}/${ctx.user._id}/${variables.metadata.id}`
                })
                return proxyFx("removeDocument")(...arguments)
            }
        }
    }
}))

