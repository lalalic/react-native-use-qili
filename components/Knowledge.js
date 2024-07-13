import React from "react"
import produce from "immer"
import { Text, View, TextInput, FlatList, Pressable, Modal, TouchableOpacity } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate} from "react-router-native"
import Select from "react-native-select-dropdown"
import {Qili} from "../store"
import { v4 } from "uuid";
import * as FileSystem from "expo-file-system"


import PressableIcon from "./PressableIcon";

const l10n=globalThis.l10n

export function Manage({labelStyle, editorStyle, selectFile}){
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
                            <PressableIcon name="remove-circle-outline" color="gray" 
                                size={20}
                                style={{ width: 40 }}
                                onPress={e => dispatch({ type: "my/knowledge/remove", index, knowledge:item.id })} />
                            <Text style={{ flexGrow: 1,  overflow:"hidden" }}>{item.name}</Text>
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
                    <Editor key={current} selectFile={selectFile} labelStyle={labelStyle}
                        data={knowledges[current]} 
                        style={[{borderTopWidth:1,borderBottomWidth:1, borderColor:"gray"},editorStyle]}
                        onClose={e=>toggleEditor(false)}
                        onSubmit={async knowledge=>{
                            if(!knowledge.id){
                                knowledge={id:`${globalThis.QiliConf.apiKey}/${(await Qili.getUser()).id}/${v4()}`, ...knowledge}
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

const localFileName="~.txt"
const localFileUri=`${FileSystem.documentDirectory}/knowledge.txt`
function Editor({ data={name:"", items:[]}, labelStyle:$labelStyle, style, onSubmit, onClose, selectFile}) {
    const [knowledge, setKnowledge]=React.useState(data)
    const [url, setUrl]=React.useState("")
    const labelStyle=React.useMemo(()=>({justifyContent:"center",padding:5, fontSize:16,color:"black",...$labelStyle}),[$labelStyle])
    const inputStyle=React.useMemo(()=>({height:40, borderWidth:1, borderColor:"gray", color:"black", padding:5, marginBottom:10}),[])
    const addUrl=React.useCallback(async url=>{
        let name=undefined
        url=url.trim()
        if(!(url.match(/\s*https?:\/\//i))){
            if(!!knowledge.items.find(a=>a.name==localFileName) &&
                await FileSystem.readAsStringAsync(localFileUri)==url){
                return 
            }
            await FileSystem.writeAsStringAsync(localFileUri, url)
            const [doc]=await selectFile({uri:localFileUri, name:localFileName})
            url=doc.url
            name=localFileName
        }

        if(knowledge.items.find(a=>a.url==url)){
            return 
        }
        const updated=produce(knowledge,$=>{
            $.items[name==localFileName ? "unshift" : "push"]({url,name})
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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={labelStyle}>{l10n['File']}</Text>
                {!!selectFile && <PressableIcon name="cloud-upload"
                        style={{ width: 30, right:5 }}
                        onPress={async (e) => {
                            if(url){
                                await addUrl(url)
                                return
                            }
                            const items = await selectFile()
                            if(items?.length){
                                setKnowledge(produce(knowledge,$=>{
                                    $.items.splice($.items.length,0, ...items)
                                }))
                            }
                        }} />}
            </View>

            <TextInput name="add" color="blue" 
                    style={[inputStyle, { flexGrow: 1, borderWidth: 1, padding: 2, paddingRight:30 }]}
                    returnKeyType="done"
                    returnKeyLabel={l10n["add"]}
                    placeholder={l10n["From url"]}
                    value={url}
                    multiline
                    numberOfLines={4}
                    onChangeText={text=>setUrl(text)}
                    />
            <FlatList data={knowledge.items}
                style={{ width: "100%", padding: 5, minHeight:50 }}
                renderItem={({ item: { url, name = url }, index }) => {
                    const content=(()=>{
                        if(name==localFileName){
                            return <TouchableOpacity style={{alignItems:"center", flexDirection:"row"}}
                                backgroundColor="lightblue"
                                onPress={e=>{
                                    FileSystem.readAsStringAsync(localFileUri)
                                        .then(content=>setUrl(content))
                                }}>
                                <Text style={{ flexGrow: 1, fontSize: 16, color:"blue" }}>{name}</Text>
                            </TouchableOpacity>
                        }else{
                            return <Text style={{ flexGrow: 1, fontSize: 16, color:"black" }}>{name}</Text>
                        }
                    })();

                    return (
                        <View style={{ display: "flex", flexDirection: "row", height: 40, alignItems: "center", }}
                            onPress={e=>{
                                if(name==localFileName){
                                    FileSystem.readAsStringAsync(localFileUri)
                                        .then(content=>setUrl(content))
                                }
                            }}
                            >
                            <PressableIcon name="remove-circle-outline" color="black" 
                                size={20}
                                style={{ width: 40 }}
                                onPress={e =>{
                                    setKnowledge(produce(knowledge,$=>{
                                        $.items.splice(index, 1)
                                    }))
                                }} />
                            {content}
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
                            const updated=await addUrl(url)
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

export function KnowledgeSelector({style, value, children, link, ...props}){
    const knowledges=useSelector(state=>state.my.knowledges)
    const navigate=useNavigate()

    return (
        <View style={[style]}>
            {children}
            <Select data={knowledges} 
                defaultValue={knowledges?.find(a=>a.id==value)}
                rowTextForSelection={(item)=>item.name}
                buttonTextAfterSelection={(item)=>item.name}
                
                defaultButtonText={l10n[!!knowledges?.length ?  'Select a knowledge' : 'No Knowledge yet']}
                buttonTextStyle={{textAlign:"left"}}
                rowTextStyle={{textAlign:"left"}}
                buttonStyle={{ width:"100%", }}
                {...props}
                />
            {link && <PressableIcon name="link" style={{width:30, position:"absolute", right:5, bottom:15}} 
                onPress={e=>navigate(link)}/>}
        </View>
        
    )
}