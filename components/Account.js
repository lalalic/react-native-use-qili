import React, { useState } from "react"
import {View, Text, Pressable, SectionList, Alert} from "react-native"
import { Link } from "react-router-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useDispatch, useSelector } from "react-redux";
import * as Updates from "expo-updates"
import { isUserLogin } from "../store"
import Loading from "./Loading";
const l10n=globalThis.l10n
export default function Account({settings, information}){
    const dispatch=useDispatch()
    const signedIn=useSelector(state=>isUserLogin(state))
    const [loading, setLoading]=useState(false)
    const sections=[
        {title:"Settings", data:[
            signedIn ? {name:"Sign Out", icon:"account-circle", 
                onPress:e=>dispatch({type:"my",payload:{admin:{}}})
            } : null,
            ...settings,
        ].filter(a=>!!a)},

        {title:"Information", data:[
            ...information,
            {
                name:`${l10n['Version']}: ${Updates.runtimeVersion} ${Updates.createdAt ? ` - ${Updates.createdAt.asDateTimeString()}` : ''}`, 
                icon:"bolt", 
                href:false,
                async onPress(){
                    setLoading(true)
                    const {isAvailable} = await Updates.checkForUpdateAsync()
                    setLoading(false)
                    if(isAvailable){
                        Alert.alert(
                            l10n["Update"], 
                            l10n[`There's an update, do you want to update?`],
                            [
                                {text:l10n["No"]},
                                {   text:l10n["Yes"], 
                                    onPress:async ()=>{
                                        setLoading(true)
                                        await Updates.fetchUpdateAsync()
                                        await Updates.reloadAsync()
                                        setLoading(false)
                                    }
                                }
                            ]
                        )
                    }else{
                        Alert.alert(l10n["Update"], l10n["There's no update."])
                    }
                }
            }
        ]}
    ]


    
    return (
        <View style={{flex: 1,padding:4, paddingTop:20}}>
            <SectionList 
                keyExtractor={a=>a.name}
                renderSectionHeader={({ section: { title } }) => (
                    <Pressable style={{flex:1}} onLongPress={e=>setMagic(true)}>
                        <Text style={{flex:1, fontSize:16, paddingTop:20, paddingLeft: 10}}>{l10n[title]}</Text>
                    </Pressable>
                )}
                renderItem={({index:i,item:{name,icon, href=`/account/${name}`, onPress, children}})=>{
                    const content=(
                        <View style={{flexDirection:"row",width:"100%",height:50, paddingTop:5,paddingBottom:5, borderBottomWidth:1,borderColor:"gray"}}>
                            <MaterialIcons style={{paddingTop:5}} name={icon} size={30} />
                            <Text style={{flexGrow:1,marginLeft:4,paddingTop:12}}>{l10n[name]}</Text>
                            {children || href!==false && <MaterialIcons style={{paddingTop:8}} name="keyboard-arrow-right"   />}
                        </View>
                    )
                    return onPress ? 
                        (<Pressable {...{children:content, onPress}}/>)
                        :(!!!children ? <Link to={href} children={content}/> : content)
                }} 
                sections={sections} /> 
                {loading && <Loading style={{position:"absolute",width:"100%",flex:1}}/>}
        </View>
    )
}