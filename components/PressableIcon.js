import React from 'react';
import { Pressable, Animated, Easing } from "react-native";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSelector, useDispatch } from "react-redux";
import { isAlreadyFamiliar, isUserLogin } from "../store";
import Loading from './Loading';
import FlyMessage from "./FlyMessage";


export default ({ AutoHideDuration = 6000, requireLogin, onPress: $onPress, onLongPress: $onLongPress, onPressIn, onPressOut, children, label, labelFade, labelStyle, style, size, ...props }) => {
    const dispatch = useDispatch();
    const needLogin = useSelector(state => requireLogin && !isUserLogin(state));
    const notNeedLabelAnyMore = useSelector(state => isAlreadyFamiliar(state));
    if (labelFade === true)
        labelFade = AutoHideDuration;
    const opacity = React.useRef(new Animated.Value(1)).current;
    React.useEffect(() => {
        if (labelFade) {
            const timing = Animated.timing(opacity, {
                toValue: 0,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: true,
            });
            timing.start();
            return () => timing.stop();
        }
    }, [labelFade]);
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
    return (
        <Pressable {...{ onPress, onLongPress, onPressIn, onPressOut, style: { justifyContent: "center", alignItems: "center", ...style } }}>
            <MaterialIcons {...props} />
            {children || (!notNeedLabelAnyMore && label && <Animated.Text numberOfLines={1} ellipsizeMode="tail" style={[labelStyle, { opacity }]}>{label}</Animated.Text>)}
            {running && <Loading style={{ position: "absolute" }} />}
        </Pressable>
    );
};
