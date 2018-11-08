
var bind = require('bind');
var csv = require('csv');
var debug = require('debug')('aws-billing');
var AWS = require('aws-sdk')
var Dates = require('date-math');

/**
 * Expose `AWSBilling`.
 */

module.exports = AWSBilling;

/**
 * Create a new `AWSBilling` instance given the AWS `key`, `secret`,
 * and S3 `bucket` and `region`.
 *
 * @param {String} accountId
 * @param {String} key
 * @param {String} secret
 * @param {String} bucket
 * @param {String} region
 * @param {String} month
 * @param {String} linkedAccountId
 * @param {Boolean} withoutTaxes
 */

function AWSBilling (accountId, key, secret, bucket, region, month=null, linkedAccountId=null, withoutTaxes=false) {
  if (!(this instanceof AWSBilling)) return new AWSBilling(accountId, key, secret, bucket, region, month, linkedAccountId, withoutTaxes);
  if (!accountId) throw new Error('AWS Billing requires a accountId.');
  if (!key) throw new Error('AWS Billing requires a key.');
  if (!secret) throw new Error('AWS Billing requires a secret.');
  if (!bucket) throw new Error('AWS Billing requires a bucket.');
  if (!region) throw new Error('AWS Billing requires a region.');
  this.accountId = accountId;
  this.bucket = bucket;
  this.month = month;
  this.linkedAccountId = linkedAccountId;
  this.withoutTaxes = withoutTaxes;
  this.AWS = new AWS.S3({ accessKeyId: key, secretAccessKey: secret, region: region });
  var self = this;
  bind.all(this);
  return function () { return self.get.apply(self, arguments); };
}

/**
 * Get the billing information.
 *
 * @param {Function} callback
 */

AWSBilling.prototype.get = function (callback) {
  this.products(function (err, products) {
    if (err) return callback(err);
    var total = 0.0;
    Object.keys(products).forEach(function (product) {
      total += products[product];
    });
    callback(null, {
      total: total,
      start: Dates.month.floor(new Date()),
      end: new Date(),
      products: products
    });
  });
};

/**
 * Get the cost of AWS products
 *
 * @param {Function} callback
 */

AWSBilling.prototype.products = function (callback) {
  var accountId = this.accountId.replace(/-/g, '');
  var now = new Date();
  var withoutTaxes = this.withoutTaxes;
  if (this.month) {
    debug('month provided %s ..', this.month);
    var file = accountId + '-aws-billing-csv-' +
      this.month + '.csv';
  }
  else {
    debug('no month provided ..');
    var file = accountId + '-aws-billing-csv-' +
      now.getFullYear() + '-' + pad(now.getMonth() + 1, 2) + '.csv';
  }
  debug('file to open is %s ..', file);
  if (this.linkedAccountId) {
    var linkedAccountId = this.linkedAccountId.replace(/-/g, '');
    debug('linked account ID %s provided', linkedAccountId);
  }
  debug('getting S3 file %s ..', file);
  this.AWS.getObject({ Bucket: this.bucket, Key: file }, function (err, res) {
    if (err) return callback(err);
    debug('got S3 stream ..');
    csv()
      .from.string(res.Body)
      .to.array(function (data) {
        var products = {};
        var productCol = data[0].indexOf('ProductCode') + 1;
        if (withoutTaxes == true) {
          var costCol = data[0].indexOf('CostBeforeTax');
          debug('costCol is set to CostBeforeTax');
        }
        else {
          var costCol = data[0].indexOf('TotalCost');
          debug('costCol is set to TotalCost');
        }
        data.forEach(function (row) {
          var product = row[productCol].toLowerCase()
            .replace(/amazon /, '')
            .replace(/aws /, '');
          var cost = parseFloat(row[costCol]);
          if (linkedAccountId) {
            var linkedAccountCol = data[0].indexOf('LinkedAccountId');
            if (row[linkedAccountCol] == linkedAccountId) {
              if (product && cost > 0) {
                if (!products[product]) products[product] = 0;
                products[product] += cost;
              }
            }
          }
          else {
            if (product && cost > 0) {
              if (!products[product]) products[product] = 0;
              products[product] += cost;
            }
          }
        });
        debug('parsed AWS product costs');
        callback(err, products);
      });
  });
};

/**
 * Pad a number with 0s.
 *
 * Credit: http://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
 *
 * @param {Number} n
 * @param {Number} width
 * @param {Number} z
 * @return {String}
 */

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
