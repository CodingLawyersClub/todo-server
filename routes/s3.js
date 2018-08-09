const crypto = require('crypto');
const AWS = require('aws-sdk');
var config = require('../config')
const { s3AccessKeyId, s3SecretAccessKey, s3Bucket } = config;
AWS.config.update({
accessKeyId: s3AccessKeyId,
secretAccessKey: s3SecretAccessKey
});
const s3 = new AWS.S3();

module.exports = {
    uploadImageToS3: (image, imageName) => {
        const random = crypto.randomBytes(16).toString('hex');
        var params = {
            ACL: 'public-read',
            Bucket: s3Bucket,
            ContentType: 'image/png',
            Key: `${imageName}-${random}.png`,
            Body: image,
        };

        return s3.upload(params).promise()
    }

}