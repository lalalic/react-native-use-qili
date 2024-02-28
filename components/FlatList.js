import React from 'react'
import {FlatList,View, ActivityIndicator} from "react-native"

export default function FlatListChildrenEmpty({
    data:$, children, style, 
    loading=<ActivityIndicator size="large"/>, 
    ...props}){
    const [data, setData]=React.useState(null)
    const [error, setError]=React.useState(null)
    const container=<View style={[style,{flex:1, alignItems:"center", justifyContent:"center"}]}/>
    React.useEffect(()=>{
        Promise.resolve($)
            .then(data=>{
                setData(data)
                setError(null)
            })
            .catch(e=>{
                setData(null)
                setError(e)
            })
    },[$])

    if(!data){
        return React.cloneElement(container, {
            children: !error ? loading : <Text style={{color:"red"}}>{error.message}</Text>
        })
    }

    if(children && data.length==0){
        return React.cloneElement(container, {children})
    }

    return <FlatList {...props} data={data} style={style}/>
}