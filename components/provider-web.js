import React, { useRef } from "react";
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import { Buffer } from "buffer";
import PressableIcon from "./PressableIcon"

import useStateAndLatest from "./useStateAndLatest"

export default function WebviewServiceProvider({ 
    id, 
    uri, 
    Context, children, 
    bro, broName, 
    onServiceReady, 
    disabled,
    webviewStyle, closerStyle,
    ...props }) {
    const webviewRef = useRef(null);
    const [status, setStatus, $status] = useStateAndLatest("loading");
    const [show, setShow]=React.useState(false)

    const webviewProps = React.useMemo(() => {
        const style={zIndex:99, position: "absolute", overflow:"hidden", width: "100%", height: "100%", top: 0, left: 0, ...webviewStyle}
        if(disabled){
            return { style: { ...style, left:99999999} }
        }

        if(show){
            return { style }
        }
        
        switch(status){
            case "loginUI":
                return { style }
            case "loginInited":
            case "logout":
            default:
                return { style: { ...style, left:99999999} }
        }
    }, [show, webviewStyle, disabled, status]);

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
            userAgent,
            name: broName
        };

        const proxy = new Proxy(extendFx, {
            get(o, fnKey) {
                return o[fnKey] || events[fnKey] || fx(fnKey);
            }
        });

        events.on("fnCall", ({ id, result }) => {
            try {
                const p = resultPs[id];
                delete resultPs[id];
                p.resolve(result);
            } catch (e) {
                console.error(e);
            }
        });

        const broCode = bro.toString();

        const injectBro = `
            window.emit=(event, data)=>window.ReactNativeWebView.postMessage(JSON.stringify({event,data}));

            ;(()=>{//intercept fetch, XMLHttpRequest
                window.fetch=(originalFetch=>async function(url, config={}){
                    const res=await originalFetch(...arguments);
                    /*
                    ;["json","text","blob","arrayBuffer","formData"].forEach(fn=>{
                        res[fn]=(original=>async function(){
                            const data=await this[fn](...arguments)
                            window.emit('fetch',{url, ...config, response:data})
                            return data
                        })(res[fn])
                    });
                    */
                    window.emit('fetch',{url, ...config})
                    return res
                })(window.fetch);

                let info=null
                XMLHttpRequest.prototype.open=(originalFx=>async function(m, url){
                    info={}
                    info.method=m
                    info.url=url
                    return await originalFx.call(this, ...arguments)
                })(XMLHttpRequest.prototype.open);

                XMLHttpRequest.prototype.send=(originalFx=>async function(data){
                    info.body=data
                    const myinfo=info
                    this.addEventListener("readystatechange",()=>{
                        if (this.readyState === XMLHttpRequest.DONE){
                            const status = this.status;
                            if (status === 0 || (status >= 200 && status < 400)) {
                                myinfo.response=this.responseText
                            }
                            return window.emit("xhr", myinfo)
                        }
                    })
                    return await originalFx.call(this, ...arguments)
                })(XMLHttpRequest.prototype.send);

                XMLHttpRequest.prototype.setRequestHeader=(originalFx=>async function(key,value){
                    if(!info.headers){
                        info.headers={}
                    }
                    info.headers[key]=value
                    return await originalFx.call(this, ...arguments)
                })(XMLHttpRequest.prototype.setRequestHeader);
            })();
            
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
        proxy
            .on("login", data=>{
                proxy.status("loginInited")
            })
            .on("logout", data=>{
                proxy.status("logout")
            })
            .on("loginUI", data=>{
                proxy.status("loginUI")
            })
            .on(`${broName}.ready`,()=>proxy.fire("ready"))
        return [proxy, injectBro];
    }, []);

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
            <View {...webviewProps}>
                <WebView
                    ref={webviewRef}
                    style={{ flex: 1 }}
                    source={{ uri }}
                    sharedCookiesEnabled={true}
                    userAgent={userAgent}
                    injectedJavaScriptBeforeContentLoaded={injectBro}
                    onMessage={onMessage}
                    onLoad={onLoad}
                    onError={e=>{service.fire("error", e)}}
                    onNavigationStateChange={onNavigationStateChange}
                    {...props} />
                <PressableIcon name="close" size={32}
                    style={{position:"absolute", top:10, right:10, ...closerStyle}} 
                    onPress={e=>setShow(!show)}/>
            </View>
            {children}
        </Context.Provider>
    );
}