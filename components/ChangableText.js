import React from 'react';
import { Text, TextInput, Pressable } from "react-native";


export default function ChangableText({ text: { value: text, ...textProps }, onChange, children, ...props }) {
    const [editing, setEditing] = React.useState(false);
    return (
        <Pressable {...props} onLongPress={e => setEditing(true)}>
            {editing ?
                <TextInput defaultValue={text} autoFocus={true} showSoftInputOnFocus={true}
                    {...textProps}
                    onEndEditing={e => {
                        if (text !== e.nativeEvent.text) {
                            onChange?.(e.nativeEvent.text);
                        }
                        setEditing(false);
                    }}
                    style={[textProps.style, { borderBottomWidth: 1, borderBottomColor: "gray" }]} /> :
                <Text {...textProps}>{text}</Text>}
            {children}
        </Pressable>
    );
}
