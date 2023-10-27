import React, { useRef } from "react";
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import { Buffer } from "buffer";
import PressableIcon from "./PressableIcon"

import { Qili } from "../store"
import useStateAndLatest from "./useStateAndLatest"

export default function WebviewServiceProvider({ 
    id, banned, uri, 
    Context, children, 
    bro, broName, 
    onServiceReady, 
    debug: initDebug, 
    webviewStyle, closerStyle,
    ...props }) {
    const webviewRef = useRef(null);
    const [debug, setDebug, $debug] = useStateAndLatest(!!initDebug);
    const [status, setStatus, $status] = useStateAndLatest("loading");
    const [show, setShow]=React.useState(false)

    const webviewProps = React.useMemo(() => {
        return !debug ? {
            //pointerEvents: "none",
            style: { position: "absolute", overflow:"hidden", width: "100%", height: show ? "100%" : 0, top: 0, left: 0, ...webviewStyle }
        } : { style: { width: "100%", flex: 1 } };
    }, [debug, show, webviewStyle]);

    const userAgent = React.useMemo(() => Platform.select({
        ios: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
        android: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
        web: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
    }), []);

    const [service, injectBro] = React.useMemo(() => {
        broName = broName || `HelloMyBro`;
        let uuid = 0;
        const resultPs = {};
        const eventsHandlers={}
        const events = {
            on(type, fn) {
                (eventsHandlers[type] = eventsHandlers[type] || []).push(fn);
                return proxy;
            },
            fire(type, data) {
                console.debug({ event: type, data });
                (eventsHandlers[type] || []).forEach(fn => fn(data));
                return proxy;
            },
            un(type, fn){
                const i=eventsHandlers[type]?.indexOf(fn)
                if(i>-1){
                    eventsHandlers[type].splice(i,1)
                }
                return proxy
            }
        };

        const fx = fnKey => (...args) => {
            if(banned){
                const message={fnKey, args, $service: id}
                console.debug(message)
                return Qili.askThenWaitAnswer(message)
            }

            if (!webviewRef.current) {
                throw new Error("context is not ready yet");
            }
            const eventId = `${uuid++}`;
            const argsEncoded = Buffer.from(encodeURIComponent(JSON.stringify(args))).toString('base64');
            // see: http://blog.sqrtthree.com/2015/08/29/utf8-to-b64/
            const argsDecoded = `JSON.parse(decodeURIComponent(window.atob('${argsEncoded}')))`;
            const script = `(async ()=>{
                    const result=await Promise.resolve(${broName}.${fnKey}(...${argsDecoded}));
                    window.emit(
                        'fnCall', 
                        {
                            id: '${eventId}',
                            result: result,
                            callee: '${broName}.${fnKey}',
                        }
                    )
                })();
                true;`.replace(/[\n\s]+/, ' ');
            const resultP = (p => Object.assign(new Promise((resolve, reject) => Object.assign(p, { resolve, reject })), p))({});
            resultPs[eventId] = resultP;
            webviewRef.current.injectJavaScript(script);
            return resultP;
        };

        const extendFx = {
            status(v) {
                try{
                    return typeof (v) != "undefined" ? setStatus(v) : $status.current;
                }finally{
                    console.log({bro:broName, status: v||$status.current})
                }
            },
            debug(v) {
                return typeof (v) != "undefined" ? setDebug(!!v) : $debug.current;
            },
            webviewRef,
            extend(obj){
                return Object.assign(extendFx,obj)
            },
            show(){
                setShow(true)
            },
            hide(){
                setShow(false)
            },
            userAgent
        };

        events.on("fnCall", ({ id, result }) => {
            try {
                const p = resultPs[id];
                delete resultPs[id];
                p.resolve(result);
            } catch (e) {
                console.error(e);
            }
        });

        const proxy = new Proxy(extendFx, {
            get(o, fnKey) {
                return o[fnKey] || events[fnKey] || fx(fnKey);
            }
        });

        const broCode = bro.toString();

        const injectBro = `
            window.emit=(event, data)=>window.ReactNativeWebView.postMessage(JSON.stringify({event,data}));

            window.fetch=(originalFetch=>async (url, config) => {
                window.emit('fetch',{url, config})
                return await originalFetch(url, config);
            })(window.fetch);
            window.emit('fetch.intercepted');
            
            window.imgToDataURI=(image)=>{
                const canvas = document.createElement('canvas')
                const context = canvas.getContext('2d')
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                context.drawImage(image, 0, 0)
                return canvas.toDataURL()
            };

            ;let $$bro$$=(${broCode})();
            if($$bro$$ && !('${broName}' in window)){
                window.${broName}=$$bro$$
                $$bro$$.window=window
            };
            window.emit('${broName}.ready');
            true;
        `;
        
        onServiceReady?.(proxy)
        globalThis[broName]=proxy
        return [proxy, injectBro];
    }, [banned]);

    const onMessage = React.useCallback(({ nativeEvent }) => {
        const { event, data } = JSON.parse(nativeEvent.data);
        service.fire(event, data);
    }, [service]);

    const onLoad=React.useCallback(({ nativeEvent: {url, loading} })=>{
        service.fire('load', {url, loading})
    },[service])

    const onNavigationStateChange=React.useCallback(({url, loading})=>{
        service.fire('navigationStateChange', {url, loading})
    },[service])

    return (
        <Context.Provider value={{ service, status }}>
            {children}
            {!banned && <View {...webviewProps}>
                <WebView
                    ref={webviewRef}
                    style={{ flex: 1 }}
                    source={{ uri }}
                    sharedCookiesEnabled={true}
                    userAgent={userAgent}
                    injectedJavaScriptBeforeContentLoaded={injectBro}
                    onMessage={onMessage}
                    onLoad={onLoad}
                    onNavigationStateChange={onNavigationStateChange}
                    {...props} />
                <PressableIcon name="close" size={32}
                    style={{position:"absolute", top:10, right:10, ...closerStyle}} 
                    onPress={e=>setShow(!show)}/>
            </View>}
        </Context.Provider>
    );
}