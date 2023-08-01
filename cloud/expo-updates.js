module.exports=(updates="updates")=>({
    name:"qili-expo-updates",
    appUpdates:{
        context:updates,
        fromManifestURI({runtimeVersion, platform}, app){
           return `https://cdn.qili2.com/${app.app.apiKey}/${updates}/${runtimeVersion}/${platform}-manifest.json?${++uuid}`
        }
    }
})

let uuid=Date.now()