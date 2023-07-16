export default function useQili({apiKey, api="https://api.qili2.com/1/graphql", ...conf}){
    globalThis.QiliConf={apiKey,api, ...conf}
}