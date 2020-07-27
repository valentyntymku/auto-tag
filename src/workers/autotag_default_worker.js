"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.AUTOTAG_TAG_NAME_PREFIX = void 0;

var _get = _interopRequireDefault(require("lodash/get"));

var AWS = _interopRequireWildcard(require("aws-sdk"));

var _autotag_settings = _interopRequireDefault(require("../autotag_settings"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const AUTOTAG_TAG_NAME_PREFIX = 'jbl:';
exports.AUTOTAG_TAG_NAME_PREFIX = AUTOTAG_TAG_NAME_PREFIX;

const https = require('https');

const AUTOTAG_CREATOR_TAG_NAME = `${AUTOTAG_TAG_NAME_PREFIX}creator_arn`;
const AUTOTAG_CREATE_TIME_TAG_NAME = `${AUTOTAG_TAG_NAME_PREFIX}created_datetime`;
const AUTOTAG_INVOKED_BY_TAG_NAME = `${AUTOTAG_TAG_NAME_PREFIX}invoked_by`;
const AUTOTAG_OWNER_EMAIL_TAG_NAME = `${AUTOTAG_TAG_NAME_PREFIX}owner_email`;
const AUTOTAG_CREATED_DATE_TAG_NAME = `${AUTOTAG_TAG_NAME_PREFIX}created_date`;
const AUTOTAG_COST_CENTER_TAG_NAME = `${AUTOTAG_TAG_NAME_PREFIX}cost_center`;
const ROLE_PREFIX = 'arn:aws:iam::';
const ROLE_SUFFIX = ':role'; // const MASTER_ROLE_NAME = 'AutoTagMasterRole';

const MASTER_ROLE_PATH = '/autotag/master/';

class AutotagDefaultWorker {
  constructor(event, s3Region) {
    this.event = event;
    this.s3Region = s3Region;
    this.region = process.env.AWS_REGION;
    this.roleName = process.env.ROLE_NAME; // increase the retries for all AWS worker calls to be more resilient
    // AWS.config.update({
    //   retryDelayOptions: {base: 300},
    //   maxRetries: 8
    // });
  }
  /* tagResource
  ** method: tagResource
  **
  ** Do nothing
  */


  tagResource() {
    return new Promise((resolve, reject) => {
      try {
        // Do nothing
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  assumeRole(roleName) {
    return new Promise((resolve, reject) => {
      try {
        AWS.config.region = 'us-east-1'; //Uncomment line below for AWS STS logging
        //AWS.config.logger = console;

        const sts = new AWS.STS();
        sts.assumeRole({
          RoleArn: this.getAssumeRoleArn(roleName),
          RoleSessionName: `AutoTag-${new Date().getTime()}`,
          DurationSeconds: 900
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            const credentials = {
              accessKeyId: data.Credentials.AccessKeyId,
              secretAccessKey: data.Credentials.SecretAccessKey,
              sessionToken: data.Credentials.SessionToken
            };
            resolve(credentials);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  dumpEventInfo() {
    console.log(`Event Name: ${this.event.eventName}`);
    console.log(`Event Type: ${this.event.eventType}`);
    console.log(`Event Source: ${this.event.eventSource}`);
    console.log(`AWS Region: ${this.event.awsRegion}`);
    console.log('---');
  }

  logTags(resources, tags, worker) {
    console.log(`\nTagging ${resources} with the ${worker} in ${this.getAccountId()} (${this.s3Region}):`);
    console.log(JSON.stringify(tags, null, 2));
  }

  getAssumeRoleArn(roleName) {
    const accountId = this.getAccountId();
    return ROLE_PREFIX + accountId + ROLE_SUFFIX + MASTER_ROLE_PATH + roleName;
  } // support for older CloudTrail logs


  getAccountId() {
    return this.event.recipientAccountId ? this.event.recipientAccountId : this.event.userIdentity.accountId;
  }

  async getAutotagTags() {
    var CostCenterTag = await this.getAutotagCostCenterTag();
    return [this.getAutotagCreatorTag(), this.getAutotagCreatedDateTag(), 
    ...(this.getOwnerEmailTagValue() && _autotag_settings.default.AutoTags.OwnerEmail ? [this.getAutotagOwnerEmailTag()] : []),
    ...(CostCenterTag && _autotag_settings.default.AutoTags.CostCenter ? [CostCenterTag] : []), 
    ...(_autotag_settings.default.AutoTags.CreateTime ? [this.getAutotagCreateTimeTag()] : []), 
    ...(this.getInvokedByTagValue() && _autotag_settings.default.AutoTags.InvokedBy ? [this.getAutotagInvokedByTag()] : []), 
    ...this.getCustomTags()];
  }

  getAutotagCreatorTag() {
    return {
      Key: this.getCreatorTagName(),
      Value: this.getCreatorTagValue()
    };
  }

  getAutotagCreateTimeTag() {
    return {
      Key: this.getCreateTimeTagName(),
      Value: this.getCreateTimeTagValue()
    };
  }

  getAutotagInvokedByTag() {
    return {
      Key: this.getInvokedByTagName(),
      Value: this.getInvokedByTagValue()
    };
  }

  getAutotagOwnerEmailTag() {
    return {
      Key: this.getOwnerEmailTagName(),
      Value: this.getOwnerEmailTagValue()
    };
  }

  getAutotagCreatedDateTag() {
    return {
      Key: this.getCreatedDateTagName(),
      Value: this.getCreatedDateTagValue()
    };
  }

  async getAutotagCostCenterTag() {
    var costCenterValue = await this.getCostCenterTagValue();
    if (costCenterValue) {
      return {
        Key: this.getCostCenterTagName(),
        Value: costCenterValue
      };
    } else {
      return false;
    }
  }

  getCreatorTagName() {
    return AUTOTAG_CREATOR_TAG_NAME;
  }

  getCreatorTagValue() {
    // prefer the this field for Federated Users
    // because it is the actual aws user and isn't truncated
    if (this.event.userIdentity.type === 'FederatedUser' && this.event.userIdentity.sessionContext && this.event.userIdentity.sessionContext.sessionIssuer && this.event.userIdentity.sessionContext.sessionIssuer.arn) {
      return this.event.userIdentity.sessionContext.sessionIssuer.arn;
    } else {
      return this.event.userIdentity.arn;
    }
  }

  getCreateTimeTagName() {
    return AUTOTAG_CREATE_TIME_TAG_NAME;
  }

  getCreateTimeTagValue() {
    return this.event.eventTime;
  }

  getInvokedByTagName() {
    return AUTOTAG_INVOKED_BY_TAG_NAME;
  }

  getInvokedByTagValue() {
    return this.event.userIdentity && this.event.userIdentity.invokedBy ? this.event.userIdentity.invokedBy : false;
  }

  getOwnerEmailTagName() {
    return AUTOTAG_OWNER_EMAIL_TAG_NAME;
  }

  getOwnerEmailTagValue() {
    if (this.event.userIdentity.arn.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)) {
      return this.event.userIdentity.arn.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)[0];
    } else {
      return false;
    }
  }

  getCreatedDateTagName() {
    return AUTOTAG_CREATED_DATE_TAG_NAME;
  }

  getCreatedDateTagValue() {
    return new Date(this.event.eventTime).toISOString().slice(0, 10);
  }

  getCostCenterTagName() {
    return AUTOTAG_COST_CENTER_TAG_NAME;
  }

  async getCostCenterTagValue() {
    return await this.getCostCenterByEmail();
  }

  async callServiceNowAPI(url, serviceNowCredentials) {
    return new Promise((resolve, reject) => {
      let dataString = '';
      var options = {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(serviceNowCredentials.username + ':' + serviceNowCredentials.password).toString('base64')
        }
      };
        const req = https.get(url, options, function (res) {
          res.on('data', chunk => {
            dataString += chunk;
          });
          res.on('end', () => {
              resolve({
                statusCode: 200,
                body: JSON.parse(dataString)
              });
          });
        });
        req.on('error', e => {
          console.error(e);
          return false;
        });
    });
  }

  async getCostCenterByEmail() {
    var getUserURL = "https://jabilit.service-now.com/api/now/table/sys_user?sysparm_query=email=" + this.getOwnerEmailTagValue();
    var serviceNowCredentials = await this.getServiceNowCredentials();
    var userLink = await this.callServiceNowAPI(getUserURL, serviceNowCredentials);
    if (userLink.body.result[0]) {
      var costCenter = await this.callServiceNowAPI(userLink.body.result[0].cost_center.link, serviceNowCredentials);
      console.log("Cost Center: " + costCenter.body.result.code);
    }
    
    if (costCenter) {
      return costCenter.body.result.code;
    } else {
      return false;
    }
  }

  async getServiceNowCredentials() {
    var secretsmanager = new AWS.SecretsManager({
      region: process.env.AWS_REGION
    });

    if (_autotag_settings.default.ServiceNowCredentialsARN) {
      var secretData = await secretsmanager.getSecretValue({
        SecretId: _autotag_settings.default.ServiceNowCredentialsARN
      }).promise();
      return JSON.parse(secretData.SecretString);
    } else {
      return false;
    }
  }

  getCustomTags() {
    const keyword = '$event.'; // substitute any word starting with the keyword in the tag value with the actual value from the event

    return this.objectMap(JSON.parse(_autotag_settings.default.CustomTags), tagValue => {
      let newTagValue = tagValue; // split up the tag value by any character except these

      const tagValueVariables = tagValue.match(/\$[A-Za-z0-9.]+/g) || [];
      tagValueVariables.forEach(tagValueVariable => {
        const tagValueVariableReplacement = (0, _get.default)(this.event, tagValueVariable.replace(keyword, ''), undefined);

        if (tagValueVariableReplacement === undefined) {
          console.log(`WARN: Failed to perform the variable substitution for ${tagValueVariable}`);
        } // replace the variable in the tag value with the associated event value


        newTagValue = newTagValue.replace(tagValueVariable, tagValueVariableReplacement);
      }); // if all of the variable substitutions in the tag value have failed drop the entire tag

      if (tagValueVariables.length > 0 && tagValueVariables.length === (newTagValue.match(/undefined/g) || []).length) {
        return false;
      }

      return newTagValue;
    });
  } // returns a new array with the values at each key mapped using mapFn(value)


  objectMap(object, mapFn) {
    return Object.keys(object).reduce((result, key) => {
      const newValue = mapFn(object[key]);
      if (newValue) result.push({
        Key: key,
        Value: newValue
      });
      return result;
    }, []);
  }

}

var _default = AutotagDefaultWorker;
exports.default = _default;