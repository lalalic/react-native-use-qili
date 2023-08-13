import React from "react"
import { Text, Image, Button, useWindowDimensions } from "react-native"
import Carousel, {Pagination} from 'react-native-snap-carousel'
import { useDispatch, useSelector } from "react-redux"
import { View } from "./colored-native"

const l10n=globalThis.l10n

export default function Tutorial({data, onDone, children,
        dimensions=useWindowDimensions(),
        sliderWidth=dimensions.width, sliderHeight=dimensions.height,
        itemWidth=sliderWidth-100, itemHeight=dimensions.height-100,
        cardStyle:{textArea,borderRadius=10, ...cardStyle}={},
        style, ...props}){
    const renderItem=React.useCallback(({item, index})=>{
        if(React.isValidElement(item))
            return item
        const {title="", image, resizeMode="contain", desc="", description=desc,backgroundColor="#234232"}=item
        return (
            <View style={[{flex:1,backgroundColor, borderRadius,flexDirection:"column"},cardStyle]}>
                <View style={{flex:1}}>
                    {!!image && (React.isValidElement(image) ? image : 
                        <Image resizeMode={resizeMode} style={{width:itemWidth, height:"100%"}} source={typeof(image)=="string" ? {uri:image} : image}/>)}
                </View>
                {!!(title||description) && (
                <View style={[{height:100, padding:10,
                    borderBottomEndRadius:borderRadius, 
                    borderBottomStartRadius:borderRadius},textArea]}>
                    {!!title && <Text style={{
                        width:"100%",
                        textAlign:"center", 
                        overflow:"hidden", 
                        marginBottom:10}}>
                        {l10n[title]}
                    </Text>}
                    {!!description && <Text>{l10n[description]}</Text>}
                </View>)}
            </View>
        )
    },[])
    const [index,setActive]=React.useState(0)
    const carouselRef=React.useRef(null)
    return (
        <View style={{flex:1,paddingBottom:100}} >
            <Carousel ref={carouselRef}
                style={[{flex:1},style]} 
                data={data}
                {...props} 
                {...{layout:'default', autoplay:true, loop:true, sliderWidth, itemWidth}}
                renderItem={renderItem}
                onSnapToItem={(index) => {
                    setActive(index) 
                    if(index==data.length-1){
                        carouselRef.current.stopAutoplay()
                        onDone && setTimeout(onDone,2000)
                    }
                }}
                />
            {children}
            <Pagination 
                dotsLength={data.length} 
                activeDotIndex={index} 
                containerStyle={{position:"absolute",bottom:10, width:"100%"}}
                dotStyle={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    marginHorizontal: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.92)'
                }}/>
        </View>
        
    )
}

export function FirstTimeTutorial(props){
    const firstTimeTutorial=useSelector(state=>state.my.firstTimeTutorial)
    const dispatch=useDispatch()
    const done=React.useCallback(()=>dispatch({type:"my", payload:{firstTimeTutorial:true}}))
    if(firstTimeTutorial)
        return null
    
    return (
        <View style={{position:"absolute",backgroundColor:"black", width:"100%", height:"100%", top:0, left:0,paddingTop:50,paddingBottom:50}}>
            <Tutorial {...props} onDone={done}>
                <View style={{position:"absolute",bottom:55, alignItems:"center", width:"100%"}}>
                    <Button title={l10n["Start expeirence"]} onPress={done}/>
                </View>
            </Tutorial>
        </View>
    )
}
