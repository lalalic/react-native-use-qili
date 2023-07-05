export default function useQili({apiKey, url}){
    globalThis.qiliAppApiKey=apiKey
    globalThis.qiliService=url//"https://api.qili2.com/1/graphql"
}