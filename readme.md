react-native-use-qili
===
utils to use qili service in react-native/expo project

cloud modules
=====
* cloud/expo-updates
* cloud/web-proxy

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
