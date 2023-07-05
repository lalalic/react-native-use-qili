import React from 'react';
import { DeviceEventEmitter } from "react-native";


export default (() => {
    let uuid = Date.now();
    return (EventName, initState) => {
        const uid = React.useRef({ id: uuid++, listener: null });

        const state = React.useReducer(
            (status, action) => {
                if (action === false)
                    return false;
                try {
                    return !status;
                } finally {
                    if (!status) { //going to enable,
                        DeviceEventEmitter.emit(EventName, uid.current.id);
                    }
                }
            },
            initState
        );

        const [, toggleSelecting] = state;

        React.useEffect(() => {
            uid.current.fn = DeviceEventEmitter.addListener(EventName, who => {
                if (who !== uid.current.id) {
                    setTimeout(() => toggleSelecting(false), 0);
                }
            });
            return () => uid.current.fn.remove();
        }, [toggleSelecting]);

        return state;
    };
})();
