module.exports=function(factory){
    const {apiKey, appKey, serviceUrl="https://api.qili2.com/1/graphql"}=factory(()=>({}))

    const unwrap=({data})=>{
        if(data.errors){
            throw new Error(errors.map(a=>a.message).join("\n"))
        }
        return data[Object.keys(data)[0]]
    }

    const fxFactory=info=>async (_, variables, ctx, graphql)=>{
        const query=info.query || graphql.operation.loc.source.body
        const res=await fetch(serviceUrl,{
            method:"post",
            headers:{
                "Content-Type":"application/json",
                "Authorization":"Bearer "+apiKey,
                "x-application-id": appKey,
            },
            body: JSON.stringify({
                query,
                variables,
            })
        })
        return unwrap(await res.json())
    }
    
    const {resolver, ...others}=factory(keys=>{
        if(Array.isArray(keys)){
            return keys.reduce((value, a)=>{
                value[a.name || a]=fxFactory(a)
                return value
            },{})
        }else{
            return fxFactory(keys)
        }
    })

    return {
        resolver,
        ...others
    }
}