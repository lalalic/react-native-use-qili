import React from "react"

export default function isAccessible(url,initialValue=false){
    const [accessible, setAccessible]=React.useState(initialValue)
    React.useEffect(()=>{
        (async()=>{
            try{
                const res=await fetch(url,{method:'HEAD'})
                setAccessible(!!res.ok)
            }catch(e){
                setAccessible(false)
            }
        })();
    },[])
    return accessible
}