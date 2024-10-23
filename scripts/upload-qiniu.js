// 上传文件到七牛云
const qiniu = require('qiniu');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
// 七牛云配置
const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET;

// 初始化七牛云客户端
const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
const config = new qiniu.conf.Config();

// 上传文件
const uploadFile = (filePath, key) => {
    const localFile = path.join(process.cwd(), filePath);
    const putPolicy = new qiniu.rs.PutPolicy({scope:bucket+":"+key});
    const uploadToken = putPolicy.uploadToken(mac);

    const extra = new qiniu.form_up.PutExtra();

    const formUploader = new qiniu.form_up.FormUploader(config);

    return new Promise((resolve, reject) => {
        formUploader.putFile(uploadToken, key, localFile, extra, (respErr, respBody, respInfo) => {
            if (respErr) {
                reject(respErr);
            } else if (respInfo.statusCode === 200) {
                resolve(respBody);
            } else {
                reject(respInfo);
            }
        });
    });
};
const [,,filePath,key]=process.argv
if(!filePath || !key){
    console.warn("filePath and key must not be empty")
    exit(1)
}

uploadFile(filePath, key).then(respBody => {
    console.log(respBody);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
