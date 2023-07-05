import React from 'react';
import { View } from "react-native";
import { ColorScheme } from './default-style';
import PressableIcon from "./PressableIcon";


export default function PopMenu({ style, triggerIconName = "more-vert", label, children, height = 50 }) {
    const color = React.useContext(ColorScheme);
    const [listing, setListing] = React.useState(false);
    return (
        <View>
            <PressableIcon name={triggerIconName} label={label} onPress={e => setListing(!listing)} />
            {listing && <View pointerEvents="box-none"
                onTouchEnd={e => setListing(false)}
                style={[
                    { position: "absolute", right: 0, bottom: 50, backgroundColor: color.backgroundColor, padding: 10, width: 50 },
                    { flexDirection: "column", justifyContent: "space-around", height: height * React.Children.toArray(children).length },
                    style
                ]}>
                {children}
            </View>}
        </View>
    );
}
