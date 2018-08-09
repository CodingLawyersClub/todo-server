module.exports = {
  secret: process.env.SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
  domain: process.env.DOMAIN,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
  mailgunApiKey: process.env.MAILGUN_API_KEY,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  s3Bucket: process.env.S3_BUCKET
};
