import React from "react"
import {View, Text, TextInput, ScrollView} from "react-native"
import Select from "react-native-select-dropdown";
import Switch from "./Switch"
import { KnowledgeSelector } from "./Knowledge";
import PressableIcon from "./PressableIcon";
const l10n=globalThis.l10n

export default function AssistantForm({inputParams, inputs, profiles, onSubmit, onCancel, style}) {
    const [value, setValue] = React.useReducer(function(state, action){
        return {...state, ...action}
    },inputs)

    return (
        <View style={[{flexGrow:1}, style]}>
            <ScrollView style={{flex:1,paddingLeft:20, paddingRight:20}}>
                {React.useMemo(()=>{
                    if(profiles && profiles.length>0){
                        inputParams=[
                            {
                                label:l10n["Profile"],
                                name:"$profile",
                                type:"options",
                                options:[{label:""}, ...profiles.map(a=>({name:a, label:a}))],
                            },
                            ...inputParams
                        ]
                    }
                    return inputParams.map(param => {
                        const Type=selectType(param)
                        return (<Type key={param.name} schema={param} value={value[param.name]} onChange={newValue=>setValue({[param.name]:newValue})}/>)
                    })
                },[inputParams, inputs, value, profiles])}
                <View style={{height:20}}/>
            </ScrollView>
            <View style={{
                    height:40,
                    flexDirection:"row", justifyContent:"space-around",
                    alignItems:"flex-end",
                }}>
                <PressableIcon name="check" onPress={()=>onSubmit(value)}/>
                <PressableIcon name="close" onPress={onCancel}/>
            </View>
        </View>
    )
}

function selectType(schema){
    if(schema.name=="customizedChatFlowDesc"){
        return Types.ignore
    }
    const regType=Object.entries(Types)
        .find(([name, Type])=>{
            return Type.reg?.test(schema.name)
        })
    if(regType){
        return regType[1]
    }
    if(schema.type=="string" && schema.rows>1){
        return Types.multiline
    }
    return Types[schema.type] || Types.ignore
}

function Container({schema, children, height=70}){
    return (
        <View style={{height, flexDirection:"column"}}>
            <Text style={{paddingBottom: 5, fontSize:12}}>
                {schema.required ? <Text style={{color:"red"}}>*</Text> : null}
                <Text style={{color:"black"}}>{l10n[schema.label||schema.name]}</Text>
            </Text>
            {React.cloneElement(children,{
                placeholder:schema.placeholder||schema.description,
                style:{fontSize:12, flexGrow: schema.rows>1 ? 1 : undefined}, borderWidth:1, borderColor:"black", borderRadius:5, padding:5})}
        </View>
    )
}

const Types={
    ignore(){
        return null
    },

    multiline({schema, value, onChange}){
        return (
            <Container schema={schema} height={80}>
                <TextInput
                    value={value??schema.default}
                    onChangeText={(text) => onChange?.(text)}
                    multiline={true}
                    numberOfLines={schema.rows}
                />
            </Container>
        )
    },
    string({schema, value, onChange}){
        return (
            <Container schema={schema}>
                <TextInput
                    value={value??schema.default}
                    onChangeText={(text) => onChange?.(text)}
                />
            </Container>
        )
    },

    number({schema, value, onChange}){
            return (
                <Container schema={schema}>
                    <TextInput
                            value={value}
                            onChangeText={(text) => setValue({[fieldName]:parseFloat(text)})}
                            keyboardType="numeric"
                        />
                </Container>
            )
    },

    boolean({schema, value, onChange}){
        return (
            <Container schema={schema}>
                <Switch
                    value={value}
                    onValueChange={(value) => onChange?.(value)}
                />
            </Container>
        )   
    },

    indexName:Object.assign(function Knowledge({schema, value, onChange}){
        return (
            <View style={{marginBottom:5, borderRadius: 5, overflow:"hidden"}}>
                <KnowledgeSelector
                    value={value}
                    onSelect={knowledge => onChange?.(knowledge)}
                    defaultButtonText={<Text style={{fontSize:14, color:"black"}}>{schema.label||schema.name}...</Text>}
                    rowTextStyle={{fontSize:14,textAlign:"left"}}
                    >
                </KnowledgeSelector>
            </View>
        )
    },{
        reg:/^qiliUpsert_\d+.indexName$/
    }),

    options({schema, value, onChange}){
        const data=React.useMemo(()=>schema.options,[schema.options])
        return (
            <View style={{marginBottom:5}}>
                <Select 
                    data={data} 
                    defaultValue={data.find(a => a.name == value)}

                    onSelect={item => onChange?.(item.name)}
                    style={{ flex: 1, width: "100%"}}

                    rowTextForSelection={item => l10n[item.label]}
                    dropdownIconPosition="right"
                    buttonTextAfterSelection={item => `${schema.label} - ${item.label}`}
                    defaultButtonText={schema.label}
                    
                    buttonStyle={{ width: "100%", borderRadius:5 }}
                    buttonTextStyle={{ textAlign: "left", fontSize: 14 }}
                    rowTextStyle={{ textAlign: "left", fontSize: undefined }} 
                    />
            </View>
        )
    },
}