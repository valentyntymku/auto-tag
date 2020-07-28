"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _awsSdk = _interopRequireDefault(require("aws-sdk"));

var _autotag_default_worker = _interopRequireWildcard(require("./autotag_default_worker"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class AutotagS3Worker extends _autotag_default_worker.default {
  /* tagResource
  ** method: tagResource
  **
  ** Tag the S3 bucket with the relevant information
  */
 
  async tagResource() {
    const roleName = this.roleName;
    const credentials = await this.assumeRole(roleName);
    this.s3 = new _awsSdk.default.S3({
      region: this.event.awsRegion,
      credentials
    });
    
    let existingTags = await this.getExistingTags(); 
    let autoTags = await this.getAutotagTags();
    
    autoTags = autoTags.filter(item => !existingTags.find(exItem => exItem.Key == item.Key));

    let tags = existingTags.concat(autoTags);

    await this.setTags(tags);
  }

  getExistingTags() {
    return new Promise((resolve, reject) => {
      try {
        this.s3.getBucketTagging({
          Bucket: this.getBucketName()
        }, (err, res) => {
          if (err) {
            if (err.code === 'NoSuchTagSet' && err.statusCode === 404) {
              resolve([]);
            } else {
              reject(err);
            }
          } else {
            resolve(res.TagSet);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  setTags(tags) {
    return new Promise((resolve, reject) => {
      try {
        const bucketName = this.getBucketName();
        this.logTags(bucketName, tags, this.constructor.name);
        this.s3.putBucketTagging({
          Bucket: bucketName,
          Tagging: {
            TagSet: tags
          }
        }, (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  getBucketName() {
    return this.event.requestParameters.bucketName;
  }

}

var _default = AutotagS3Worker;
exports.default = _default;