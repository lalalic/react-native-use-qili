import React, {Suspense} from "react"
import {View, Text, Button} from "react-native"
import expect from "expect.js"

const TestCollector=[]
Object.assign(globalThis,{
    describe(title, fx){
        return ()=>(<Describe {...{title, fx}}/>)
    },
    it(title, fx){
        TestCollector.push(<It {...{title, fx}}/>)
    },
    xit(title){
        TestCollector.push(<It {...{title}}/>)
    },
    expect,
})

function Describe({title, fx}){
    const [tests, setTests]=React.useState([])
    React.useEffect(()=>{
        Promise.resolve(fx())
            .then(()=>{
                setTests([...TestCollector])
                TestCollector.splice(0, TestCollector.length)
            })
    },[])
    
    return (
        <View>
            <Text>{title}</Text>
            <View style={{paddingLeft:20, paddingTop:10, overflow:"hidden"}}>
                {tests.map((a,i)=>React.cloneElement(a,{key:i}))}
            </View>
        </View>
    )
}

function It({title, fx}){
    const [result, setResult]=React.useState("yellow")
    React.useEffect(()=>{
        try{
            if(!fx){
                setResult("gray")
                return 
            }
            Promise.resolve(fx())
                .then(()=>setResult("green"))
                .catch(e=>setResult(e))
        }catch(e){
            setResult(e)
        }
    },[])

    const style={paddingBottom:10}


    switch(typeof(result)){
        case "string":
            return (
                <Text style={[style, {color: result}]}>
                    {title}
                </Text>
            )
        case "object":
            return (
                <Text style={style}>
                    <Text>{title} : </Text>
                    <Text style={{color:"red",paddingLeft:5}}>
                        {result.message}
                    </Text>
                </Text>)
        default:
            return null
    }
}

export default function TestSuite({fixture:Fixture}){
    const [runId, setRunId]=React.useState(Date.now())
    return (
        <View>  
            <Button onPress={e=>setRunId(Date.now())} title="Run Again"/>
            <Suspense>
                <Fixture key={runId}/>
            </Suspense>
        </View>
    )
}