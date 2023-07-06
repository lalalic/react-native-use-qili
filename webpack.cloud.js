
require('dotenv').config()
const projectRoot=process.cwd()
const {["QILI_APP"]:qiliApp} = process.env

module.exports=()=>({
    entry:[`${projectRoot}/cloud/index.js`],
    target:"node",
    externals: [
        function(context, request, callback){
            switch(request){
                case "react":
                case "react-dom/server":
                case "react-router":
                case "graphql-subscriptions":
                case "graphql-redis-subscriptions":
                case "stream":
                    return callback(null, 'commonjs '+request)
            }

            callback()
        }
    ],
    output:{
        path:`${projectRoot}/cloud`,
        filename:"bundled.js",
        devtoolNamespace: qiliApp
    },
    mode:"production",
    plugins:[
        new (require("webpack")).EvalSourceMapDevToolPlugin({
            exclude:/node_modules/,//(?!\/qili\-app)/,
            moduleFilenameTemplate: `webpack:///${qiliApp}/[resource-path]?[loaders]`
        })
    ]
})