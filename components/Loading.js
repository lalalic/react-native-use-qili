import React from 'react';
import { ActivityIndicator } from "react-native";


export default function Loading({ style, onLongPress, ...props }) {
    const style0 = { flex: 1, alignItems: "center", justifyContent: "center" };
    return <ActivityIndicator size="large" style={[style0, style]} {...props} />;
}
