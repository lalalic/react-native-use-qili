import React from 'react';
import { Pressable, Animated, Easing, Text, View } from "react-native";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSelector, useDispatch } from "react-redux";
import { isAlreadyFamiliar, isUserLogin } from "../store";
import Loading from './Loading';
import FlyMessage from "./FlyMessage";


export default ({ AutoHideDuration = 3000, requireLogin, 
    onPress: $onPress, onLongPress: $onLongPress, 
    emphasizer=(<View pointerEvent="none" style={{position:"absolute",bottom:0,right:0,width:5,height:5,backgroundColor:"red", borderRadius:5}}/>),
    onPressIn, onPressOut, children, 
    label, labelFade, labelStyle, 
    style, ...props 
}) => {
    const dispatch = useDispatch();
    const needLogin = useSelector(state => requireLogin && !isUserLogin(state));
    const notNeedLabelAnyMore = useSelector(state => isAlreadyFamiliar(state));
    if (labelFade === true)
        labelFade = AutoHideDuration;
    const opacity = React.useRef(new Animated.Value(1)).current
    const fadeDone=useFade(labelFade, opacity);
    const { onPress, onLongPress, running } = useStatefulPress({$onPress,$onLongPress, needLogin, dispatch, requireLogin});
    const AText=labelFade ? Animated.Text: Text
    return (
        <Pressable {...{ onPress, onLongPress, onPressIn, onPressOut, style: { justifyContent: "center", alignItems: "center", ...style } }}>
            <MaterialIcons {...props} />
            {children || (!notNeedLabelAnyMore && label && !fadeDone &&
                <AText numberOfLines={1} 
                    ellipsizeMode="tail" 
                    style={[!!labelFade && {position:"absolute",bottom:5,right:-5,width:100, textAlign:"right"}, labelStyle, { opacity }]}>
                    {label}
                </AText>
            )}
            {!!$onLongPress && emphasizer}
            {running && <Loading style={{ position: "absolute" }} />}
        </Pressable>
    );
};

function useFade(labelFade, opacity) {
    const [fadeDone, setFadeDone]=React.useState(false)
    React.useEffect(() => {
        if (labelFade) {
            const timing = Animated.timing(opacity, {
                toValue: 0,
                duration: labelFade,
                easing: Easing.linear,
                useNativeDriver: true,
            });
            timing.start(() => setFadeDone(true));
            return () => timing.stop();
        }
    }, [labelFade, setFadeDone]);
    return fadeDone
}

function useStatefulPress({$onPress, needLogin, dispatch, requireLogin, $onLongPress}) {
    const [running, setRunning] = React.useState(false);
    const onPress = React.useCallback(async (e) => {
        if ($onPress) {
            if (needLogin) {
                dispatch({ type: "my", payload: { requireLogin } });
                return;
            }
            try {
                setRunning(true);
                e.loading = setRunning;
                await $onPress(e);
            } catch (e) {
                FlyMessage.error(e.message);
            } finally {
                setRunning(false);
            }
        }
    }, [$onPress]);
    const onLongPress = React.useCallback(async (e) => {
        if ($onLongPress) {
            try {
                if (needLogin) {
                    dispatch({ type: "my", payload: { requireLogin } });
                    return;
                }
                setRunning(true);
                e.loading = setRunning;
                await $onLongPress(e);
            } catch (e) {
                FlyMessage.error(e.message);
            } finally {
                setRunning(false);
            }
        }
    }, [$onLongPress]);
    return { onPress, onLongPress, running }
}

