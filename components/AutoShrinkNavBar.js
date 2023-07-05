import React from 'react';
import { View } from "react-native";
import PopMenu from './PopMenu';


export default function AutoShrinkNavBar({ children, label, style, size = 4 }) {
    children = React.Children.toArray(children).flat().filter(a => !!a);
    const popup = (() => {
        if (children.length <= size) {
            return null;
        }
        return (
            <PopMenu {...{ label }}>
                {children.splice(size - 1)}
            </PopMenu>
        );
    })();
    return (
        <View style={[{ flexDirection: "row", justifyContent: "space-around" }, style]}>
            {children}
            {popup}
        </View>
    );
}
