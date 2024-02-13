const proxy=require('./graphql-proxy')
module.exports=({apiKey, chatflowId:defaultChatflowId})=>proxy(proxyFx=>({
    name:"predict",
    apiKey, 
    appKey:"ai",
    typeDefs:`
        extend type Query{
            predict(chatflow:String, config:JSON!):JSON
        }
        extend type Mutation{
            uploadDocument(urls:[String]!, name: String!):Boolean
            removeDocument(name:String!):Boolean
        }
    `,
    resolver:{
        Query:{
            async predict(_, { chatflow=defaultChatflowId, config }){
                const prediction=await fetch(`https://ai.qili2.com/api/v1/prediction/${chatflow}`,
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
            ...proxyFx(['uploadDocument', 'uploadDocument'])
        }
    }
}))

