import React from "react"
import {View, Text, Platform} from "react-native"
import * as FileSystem from "expo-file-system"
import { Audio } from 'expo-av';

import { Qili, getSession } from "../store"
import PressableIcon from "./PressableIcon"
import PlaySound from "./PlaySound"
import IosRecognizer from "./Recognizer"
import {alert} from "./Prompt"

const l10n=globalThis.l10n

export default function RecordSample({
    TestSample=PressableIcon,
    style,  color="white",

    value,

    file, 
    saveKey,
    
    sampleStyle={}, sampleWords=l10n["Audio Sample"],
    children=<DefaultSampleWords style={sampleStyle} show={true} words={sampleWords}/>,

    onChange,
    onDelete,
    onRecord,

    }){
        
    if(!file){
        file=`${FileSystem.documentDirectory}audio/sample`
    }
    const audioSample=value
    const [recording, setRecording]=React.useState(false)
    const [saving, setSaving]=React.useState(false)
    React.useEffect(()=>{
        DefaultSampleWords.setRecording?.(recording)
    },[recording])
    if(!onRecord){
        onRecord=React.useCallback(async record=>{
            if(!record.recognized){
                return 
            }
            if(record.recognized.length < 30){
                alert(l10n["Invalid Sample"])
                return 
            }
            setSaving(true)
            const ext="wav"
            saveKey=saveKey || `audio/${(await Qili.getUser()).id}/sample.${ext}`
            return Qili.upload({file:`${file}.${ext}`, key:saveKey},getSession())
                .then(audioSample=>{
                    if(audioSample){
                        onChange?.(audioSample, `${file}.${ext}`)
                    }
                })
                .finally(()=>setSaving(false))
        },[])
    }
    
    return (
        <>
            <View style={[{display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"space-around"},style]}>
                <PressableIcon name="mic" 
                    color={recording ? "red" : color} 
                    size={32} 
                    loading={saving}
                    onPressIn={e=>setRecording(true)}
                    onPressOut={e=>setRecording(false)}
                    />
                {!!audioSample ? <PlaySound.Trigger
                    name="play-circle-outline" 
                    color={color}
                    audio={`${file}.wav`}
                    /> : <PressableIcon/>}

                {!!audioSample ? <TestSample 
                    sample={audioSample} 
                    text={l10n["Audio Sample"].split(/[.!。！]/)[0]}
                    /> : <PressableIcon />}

                {!!audioSample && onDelete ? <PressableIcon name="delete" color={color}
                    onPress={onDelete}
                    /> : <PressableIcon />}
            </View>
            {recording && <Recognizer uri={`${file}.wav`} NoHint={true} locale="zh"
                onRecord={onRecord}
                onError={e=>console.error(e)}
                />}
            {recording && children}
        </>
    )
}
 
export function DefaultSampleWords({style, show, words}){
    const [recording, setRecoring]=React.useState(show)
    React.useEffect(()=>{
        DefaultSampleWords.setRecording=setRecoring
        return ()=>delete DefaultSampleWords.setRecording
    },[])
    if(!recording)
        return null
    return (
        <View style={[{padding:10, position:"absolute",left:0, bottom:30,width:"100%", backgroundColor:"black"},style]}>
            <Text style={{textAlign:"center",marginBottom:10}}>{l10n("Read aloud following text")}</Text>
            <Text style={{fontSize:16}}>{words}</Text>
            <Recognizer.Wave style={{height:10, width:"100%"}}/>
        </View>
    )
}

const AndroidRecorder=Object.assign(function AndroidRecorder({uri, onRecord, onError}){
    React.useEffect(() => {
        let recording=null
        ;(async ()=>{
            try {
                const res=await Audio.requestPermissionsAsync();
                if(res.status !== 'granted'){
                    throw new Error('Permission to access microphone is not granted')
                }

                const recordingOptions = {
                    android: {
                        extension: '.wav',
                        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
                        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
                        sampleRate: 44100,
                        numberOfChannels: 2,
                        bitRate: 128000,
                    },
                    ios: {
                        extension: '.wav',
                        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
                        sampleRate: 44100,
                        numberOfChannels: 2,
                        bitRate: 128000,
                        linearPCMBitDepth: 16,
                        linearPCMIsBigEndian: false,
                        linearPCMIsFloat: false,
                    },
                };
    
                recording = new Audio.Recording();
                await recording.prepareToRecordAsync(recordingOptions);
                await recording.startAsync();
            } catch (error) {
                onError?.(error)
            }
        })();

        return async ()=>{
            try{
                if(recording){
                    const status=await recording.stopAndUnloadAsync()
                    const dir=uri=>uri.replace(/[^/]+$/,"")
                    await FileSystem.makeDirectoryAsync(dir(uri), {intermediates:true})
                    await FileSystem.moveAsync({
                        from: recording.getURI(),
                        to: uri,
                    })
                    onRecord?.({
                        recognized:"".padEnd((status.durationMillis/1000)*3,"*")
                    })
                }
            }catch (error) {
                onError?.(error)
            }
        }
    },[uri, onRecord, onError])

    return null
},{
    Wave:()=>null
})

const Recognizer=Platform.select({
    ios:IosRecognizer, 
    android:AndroidRecorder
})