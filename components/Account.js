import React, { } from "react"
import {View, Text, Pressable, SectionList, Alert} from "react-native"
import { Link } from "react-router-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useDispatch, useSelector } from "react-redux";
import * as Updates from "expo-updates"
import { isUserLogin, Qili, Reset } from "../store"
import Loading from "./Loading";
const l10n=globalThis.l10n
export default function Account({settings, information, onDeleteAccount}){
    const dispatch=useDispatch()
    const [loading, setLoading]=React.useState(false)
    const signedIn=useSelector(state=>isUserLogin(state))
    const deleteAccount=React.useCallback(async ()=>{
        setLoading(true)
        const yes=await new Promise(resolve=>{
            Alert.alert(
                l10n["Delete Account"],
                l10n[`Are you sure you want to delete everything of your account?`],
                [
                    {text:l10n["Cancel"],onPress:()=>resolve(false)},
                    {text:l10n["Yes"], onPress: ()=>resolve(true)}
                ]
            )
        })
        if(!yes){
            return 
        }
        await Qili.fetch({
            query:`mutation{ done:deleteAccount }`
        })
        onDeleteAccount?.()
        dispatch(Reset)
        setLoading(false)
        return true
    },[])
    const checkUpdate=React.useCallback(async()=>{
        setLoading(true)
        await new Promise(async resolv=>{
            const {isAvailable} = await Updates.checkForUpdateAsync()
            if(isAvailable){
                Alert.alert(
                    l10n["Update"], 
                    l10n[`There's an update, do you want to update?`],
                    [
                        {text:l10n["No"]},
                        {text:l10n["Yes"], 
                            onPress:async ()=>{
                                await Updates.fetchUpdateAsync()
                                await Updates.reloadAsync()
                                resolve()
                            }
                        }
                    ]
                )
            }else{
                Alert.alert(l10n["Update"], l10n["There's no update."])
                resolve()
            }
        })
        setLoading(false)
    },[])
    const sections=[
        {title:"Settings", data:[
            signedIn && {name:"Sign Out", href:false, icon:"account-circle", onPress:e=>dispatch({type:"my",payload:{admin:{}}}) },
            signedIn && {name:"Delete Account", href:false, icon:"delete-forever", onPress:deleteAccount},
            ...settings,
        ].filter(a=>!!a)},

        {title:"Information", data:[
            ...information,
            {
                name:`${l10n['Version']}: ${Updates.runtimeVersion} ${Updates.createdAt ? ` - ${Updates.createdAt.asDateTimeString()}` : ''}`, 
                icon:"bolt", 
                href:false,
                onPress: checkUpdate
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