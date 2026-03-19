const AWS = require('aws-sdk');
const logger = require('../utils/logger');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

const BUCKET = process.env.AWS_BUCKET_NAME || 'sducs-mk-storage';

const uploadFile = async ({ key, buffer, contentType, metadata = {} }) => {
  try {
    const params = {
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
      ServerSideEncryption: 'AES256',
    };

    const result = await s3.upload(params).promise();
    logger.info(`Uploaded to S3: ${key}`);
    return result;
  } catch (err) {
    logger.error('S3 upload error:', err);
    throw err;
  }
};

const deleteFile = async (key) => {
  try {
    await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();
    logger.info(`Deleted from S3: ${key}`);
  } catch (err) {
    logger.error('S3 delete error:', err);
    throw err;
  }
};

const getSignedUrl = async (key, expiresIn = 3600) => {
  try {
    return s3.getSignedUrlPromise('getObject', {
      Bucket: BUCKET,
      Key: key,
      Expires: expiresIn,
    });
  } catch (err) {
    logger.error('S3 signed URL error:', err);
    throw err;
  }
};

const deleteMultiple = async (keys) => {
  if (!keys || keys.length === 0) return;
  try {
    const params = {
      Bucket: BUCKET,
      Delete: { Objects: keys.map(k => ({ Key: k })), Quiet: true },
    };
    await s3.deleteObjects(params).promise();
    logger.info(`Deleted ${keys.length} files from S3`);
  } catch (err) {
    logger.error('S3 bulk delete error:', err);
    throw err;
  }
};

module.exports = { uploadFile, deleteFile, getSignedUrl, deleteMultiple };
