react-native-use-qili
===
utils to use qili service in react-native/expo project

cloud modules
=====
* cloud/expo-updates([updates])
* cloud/web-proxy: deprecated
* cloud/graphql-proxy(proxyFx=>({appKey, apiKey, ...module})): make a proxy module for appKey
    * proxyFx( resolverFunctionName | {name, query}, ...)
        * array -> {[funName]:resolverFunc, ...}
        * 1 -> resolverFunc
* cloud/predict({apiKey for ai, chatflowId as default})
    * predict({chatflowId, config})
    * uploadDocument({urls, name})
    * removeDocument(name)
* cloud/iap({path='/verifyReceipt', password, onVerified,...}}): support apple iap
* cloud/events: log built-in events

api
===
* useQili({apiKey, url})
* store: redux store
    * Qili
* components
    * useAsk
    * Loading
    * Login
    * ChatProvider
    * default-style
    * provider-web
    * SubscribeHelpQueue
    * webview-services-factory
    * makeQiliService
* scripts: load .env for keys: [QILI_TOKEN, QILI_APP, QILI_UPDATES: updates uri context]
    * chrome-extension-to-service
    * export-updates

scripts
=====
* chrome-extension-to-service.js : merge content_scripts, services, and background into a js for react web/native 

bin
===
* qili-export-updates: create updates manifest and upload
* qili-get-session-token: get session token of app for a contact
* qili-get-access-token: generate access token for type and name
* screenshots: convert all images in a folder for devices, default 4 ios devices, [folderPath] [outputFolder] [devicesFilePath: a json file : [{name, width, height}]]

bridge-chrome-extension
=====
helper to provide service for chatgpt from desktop

Break Changes
=====

> 1.1.0
>> remove all chat provider, chatgpt, bing, and etc. 

todo
===
* login code as password in UI