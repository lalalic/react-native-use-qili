module.exports={
    name:"qili-expo-updates",
    appUpdates:{
        fromManifestURI({runtimeVersion, platform, app}){
           return `https://cdn.qili2.com/${app.apiKey}/updates/${runtimeVersion}/${platform}-manifest.json`
        }
    }
}