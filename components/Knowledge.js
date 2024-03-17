import React from "react"
import produce from "immer"
import { Text, View, TextInput, FlatList, Pressable, Modal } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate} from "react-router-native"
import Select from "react-native-select-dropdown"
import { v4 } from "uuid";


import PressableIcon from "./PressableIcon";

const l10n=globalThis.l10n

export function Manage({labelStyle, selectFile}){
    const dispatch=useDispatch()
    const knowledges=useSelector(state=>state.my.knowledges)||[]
    const [current, setCurrent]=React.useState(-1)
    const [showEditor, toggleEditor]=React.useState(false)
    return (
        <View style={{flex:1, flexDirection:"column"}}>
            <View style={[labelStyle,{flexDirection:"row", alignItems:"center"}]}>
                <Text>{l10n['Knowledges']}</Text>
                <PressableIcon name={current==-1 ? "add-circle": "edit"} 
                    color="yellow" 
                    onPress={e=>toggleEditor(!showEditor)}/>
            </View>
            {!!knowledges.length && <FlatList style={{flex:1, borderWidth:1}} 
                data={knowledges}
                renderItem={({item, index})=>{
                    return (
                        <Pressable style={{flexDirection:"row", alignItems:"center", height:40, backgroundColor: current==index ? "skyblue" : "transparent"}}
                            onPress={()=>setCurrent(current==index ? -1 : index)}
                            >
                            <PressableIcon name="remove-circle-outline" color="gray" style={{ width: 40 }}
                                onPress={e => dispatch({ type: "my/knowledge/remove", index, knowledge:item.id })} />
                            <Text style={{ flexGrow: 1,  fontSize: 16 }}>{item.name}</Text>
                        </Pressable>
                    )
                }}
                keyExtractor={(item,i)=>`${item.name}-${i==current}`}
                /> || (
                    <View style={{flex:1, alignItems:"center", justifyContent:"center"}}>
                        <Text style={{color:"gray"}}>{l10n['No knowledge yet.']}</Text>
                    </View>
            )}
            <Modal visible={showEditor} animationType="slide" transparent={true}>
                <View style={[{ flex:1, justifyContent:"center",  width: "100%"}]}>
                    <Editor key={current} selectFile={selectFile}
                        data={knowledges[current]} 
                        style={{borderTopWidth:1,borderBottomWidth:1, borderColor:"gray"}}
                        onClose={e=>toggleEditor(false)}
                        onSubmit={knowledge=>{
                            if(!knowledge.id){
                                knowledge.id=v4()
                            }
                            dispatch({type:"my/knowledge/set", knowledge, index:current})
                            if(current==-1){
                                setCurrent(knowledges.length)
                            }
                            toggleEditor(false)
                        }}/>
                </View>
            </Modal>
        </View>
    )
}

function Editor({ data={name:"", items:[]}, style, onSubmit, onClose, selectFile}) {
    const [knowledge, setKnowledge]=React.useState(data)
    const [url, setUrl]=React.useState("")
    const labelStyle=React.useMemo(()=>({justifyContent:"center",padding:5, fontSize:20,color:"black"}),[])
    const inputStyle=React.useMemo(()=>({height:40, borderWidth:1, borderColor:"gray", color:"black", padding:5, marginBottom:10}),[])
    const addUrl=React.useCallback(url=>{
        url=url.trim()
        if(knowledge.items.find(a=>a.url==url)){
            return 
        }
        const updated=produce(knowledge,$=>{
            $.items.push({url})
        })
        setKnowledge(updated)
        setUrl("")
        return updated
    },[knowledge])
    return (

        <View style={[{ width: "100%", flexDirection: "column", padding:10, backgroundColor:"white"}, style]}>
            <Text style={labelStyle}>{l10n['Knowledge Name']}</Text>
            <TextInput style={[inputStyle, { fontSize: 16, paddingLeft: 5 }]}
                    value={knowledge.name}
                    onChangeText={text=>setKnowledge({...knowledge, name:text})}
                    />
            <Text style={labelStyle}>{l10n['File']}</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput name="add" color="blue" 
                    style={[inputStyle, { flexGrow: 1, borderWidth: 1, padding: 2, paddingRight:30 }]}
                    returnKeyType="done"
                    returnKeyLabel={l10n["add"]}
                    placeholder={l10n["From url"]}
                    value={url}
                    onChangeText={text=>setUrl(text)}
                    onSubmitEditing={async e => {
                        url && addUrl(url)
                    }} />
                {!!selectFile && <PressableIcon name="cloud-upload"
                    style={{ width: 30, position:"absolute", right:5 }}
                    onPress={async (e) => {
                        const items = await selectFile()
                        if(items?.length){
                            setKnowledge(produce(knowledge,$=>{
                                $.items.splice($.items.length,0, ...items)
                            }))
                        }
                    }} />}
            </View>
            <FlatList data={knowledge.items}
                style={{ width: "100%", padding: 5, minHeight:50 }}
                renderItem={({ item: { url, name = url }, index }) => {
                    return (
                        <View style={{ display: "flex", flexDirection: "row", height: 40, alignItems: "center", }}>
                            <PressableIcon name="remove-circle-outline" color="black" style={{ width: 40 }}
                                onPress={e =>{
                                    setKnowledge(produce(knowledge,$=>{
                                        $.items.splice(index, 1)
                                    }))
                                }} />
                            <Text style={{ flexGrow: 1, fontSize: 16, color:"black" }}>{name}</Text>
                        </View>
                    );
                }}
                keyExtractor={item => item.url}
                extraData={knowledge.items.length} />
            <View style={{flexDirection:"row", alignItems:"center", justifyContent:"space-around"}}>
                <PressableIcon name="check"
                    onPress={async e=>{
                        if(!knowledge.name)
                            return 
                        if(url){
                            const updated=addUrl(url)
                            if(updated){
                                onSubmit(updated)
                                return 
                            }
                        }
                        onSubmit(knowledge)
                    }}/>
                <PressableIcon name="close"  onPress={e=>onClose()}/>
            </View>
        </View>
    )
}

export function KnowledgeSelector({onSelect, style, value, children, link}){
    const knowledges=useSelector(state=>state.my.knowledges)
    const navigate=useNavigate()

    return (
        <View style={[style]}>
            {children}
            <Select data={knowledges} 
                defaultValue={knowledges?.find(a=>a.id==value)}
                defaultButtonText={l10n['Select a knowledge']}
                buttonTextStyle={{textAlign:"left"}}
                rowTextStyle={{textAlign:"left"}}
                buttonStyle={{ width:"100%", }}
                rowTextForSelection={(item)=>item.name}
                buttonTextAfterSelection={(item)=>item.name}
                onSelect={onSelect}/>
            {link && <PressableIcon name="link" style={{width:30, position:"absolute", right:5, bottom:15}} 
                onPress={e=>navigate(link)}/>}
        </View>
        
    )
}