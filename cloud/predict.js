module.exports=({apiKey, chatflowId})=>({
    name:"predict",
    typeDefs:`
        extend type Query{
            predict(chatflow:String, config:JSON!):JSON
        }
    `,
    resolver:{
        Query:{
            async predict(_, { chatflow=chatflowId, config }){
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
        }
    }
})