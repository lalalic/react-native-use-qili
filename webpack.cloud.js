
module.exports=()=>({
    entry:[`${process.cwd()}/cloud/index.js`],
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
        path:`${__dirname}/cloud`,
        filename:"bundled.js",
        devtoolNamespace:"wechat-bot"
    },
    mode:"production",
    plugins:[
        new (require("webpack")).EvalSourceMapDevToolPlugin({
            exclude:/node_modules/,//(?!\/qili\-app)/,
            moduleFilenameTemplate: 'webpack:///wechat-bot/[resource-path]?[loaders]'
        })
    ]
})