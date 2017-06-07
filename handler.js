
const AWS = require('aws-sdk');
const FileSizeUtil = require('file-size');
const PathUtil = require('path');
const escapeStringRegexp = require('escape-string-regexp');
const s3 = new AWS.S3();

const maxResponseSizeInMb = 6;
const bucketName = process.env.BUCKET_NAME || 'test-develop-bucket';
const variablePrefix = process.env.VARIABLE_PREFIX || 'JS_APP_';
const versionKey = process.env.VERSION_KEY || 'version-key';
const indexFileName = process.env.INDEX_FILE_NAME || 'index.html';

const variableRegExp = new RegExp('^' + variablePrefix);
const foundVariables = Object.keys(process.env)
    .filter((name) => variableRegExp.test(name))
    .map(name => ({ name, value: process.env[name] }));

const successResponse = ({ body, contentType }) => ({
  statusCode: 200,
  headers: {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  },
  body,
});

const errorResponse = () => ({
  statusCode: 404,
  headers: {
    'Content-Type': 'text/html'
  },
  body: 'Not Found'
});

const urlRedirectResponse = ({ url }) => ({
  statusCode: 302,
  headers: {
    Location: url
  }
});

const isJavaScriptContentType = (contentType) => {
  switch (String(contentType).toLowerCase()) {
    case 'application/javascript':
      return true;
    default:
      return false;
  }
};

const isJsonContentType = (contentType) => {
  switch (String(contentType).toLowerCase()) {
    case 'application/json':
      return true;
    default:
      return false;
  }
};

const exceedsMaxLambdaResponseSize = (contentLength) => {
  const sizeInMb = FileSizeUtil(contentLength).to('MB');
  return sizeInMb >= maxResponseSizeInMb;
};

const substituteJavascriptVariables = (body) => {
  return foundVariables
      .reduce(
        (js, { name, value }) => js.replace(
          new RegExp(escapeStringRegexp(`process.env.${name}`), 'g'),
          JSON.stringify(value)
        ),
        body
      );
};

exports.serveIndex = (event, context, callback) => {
  const filePath = PathUtil.join(versionKey, indexFileName);
  s3.getObject({
    Bucket: bucketName,
    Key: filePath,
  }, (err, res) => {
    if (err) {
      return callback(null, errorResponse());
    }
    callback(null, successResponse({
      contentType: res.ContentType,
      body: res.Body.toString('utf8')
    }));
  });
};

exports.serveFileOrIndex = (event, context, callback) => {
  const filePath = PathUtil.join(versionKey, event.pathParameters.any);
  // get the request object from the bucket
  s3.getObject({
    Bucket: bucketName,
    Key: filePath,
    ResponseCacheControl: 'no-cache'
  }, (err, res) => {
    if (err) {
      return exports.serveIndex(event, context, callback);
    }

    const contentLength = res.ContentLength;
    const contentType = res.ContentType;

    if (exceedsMaxLambdaResponseSize(contentLength) || (!isJavaScriptContentType(contentType) && !isJsonContentType(contentType))) {
      // get a signed url for a getObject action
      const url = s3.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: filePath,
      });
      callback(null, urlRedirectResponse({ url }));
    } else {
      const body = isJavaScriptContentType(contentType)
        ? substituteJavascriptVariables(res.Body.toString('utf8'))
        : res.Body.toString('utf8');
      callback(null, successResponse({
        contentType: contentType,
        body
      }));
    }
  });
};

exports.serveConfiguration = (event, context, callback) => {
  const configuration = {};
  foundVariables.forEach(({ name, value }) => {
    configuration[name] = value;
  });
  callback(null, successResponse({
    contentType: 'application/json',
    body: JSON.stringify(configuration)
  }));
};
