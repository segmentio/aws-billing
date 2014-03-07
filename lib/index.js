
var Batch = require('batch');
var bind = require('bind');
var csv = require('csv');
var debug = require('debug')('aws-billing');
var Ec2 = require('awssum-amazon-ec2').Ec2;
var knox = require('knox');
var once = require('once');
var prices = require('./ec2-prices');

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
 */

function AWSBilling (accountId, key, secret, bucket, region) {
  if (!(this instanceof AWSBilling)) return new AWSBilling(accountId, key, secret, bucket, region);
  if (!accountId) throw new Error('AWS Billing requires a accountId.');
  if (!key) throw new Error('AWS Billing requires a key.');
  if (!secret) throw new Error('AWS Billing requires a secret.');
  if (!bucket) throw new Error('AWS Billing requires a bucket.');
  if (!region) throw new Error('AWS Billing requires a region.');
  this.accountId = accountId;
  this.knox = knox.createClient({ key: key, secret: secret, bucket: bucket });
  this.ec2 = new Ec2({ accessKeyId: key, secretAccessKey: secret, region: region });
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
  new Batch(this.getEc2, this.getNonEc2).end(function (err, results) {
    if (err) return callback(err);
    callback(null, {
      ec2: results[0],
      nonEc2: results[1],
      total: results[0] + results[1]
    });
  });
};

/**
 * Get the current cost of EC2 instances.
 *
 * @param {Function} callback
 */

AWSBilling.prototype.getEc2 = function (callback) {
  callback = once(callback); // hack: get rid of a horrible AWS sdk bug
  var self = this;
  debug('describing ec2 instances ..');
  this.ec2.DescribeInstances(function(err, res) {
    if (err) return callback(err);
    var reservations = res.Body.DescribeInstancesResponse.reservationSet.item; // wow, wtf?
    var instances = [];
    reservations.forEach(function (r) {
      var item = r.instancesSet.item;
      if (Array.isArray(item)) instances.push.apply(instances, item);
      else instances.push(item);
    });
    debug('described ec2 instances');
    var cost = instances
        .filter(function (i) { return i.instanceState.name === 'running'; })
        .map(function (i) { return prices[i.instanceType] * 24 * 30; })
        .reduce(function (memo, cost) { return memo + parseFloat(cost); }, 0);
    debug('monthly ec2 cost: $%d', cost);
    callback(null, cost);
  });
};

/**
 * Get the cost of non-EC2 AWS stuff.
 *
 * @param {Function} callback
 */

AWSBilling.prototype.getNonEc2 = function (callback) {
  var accountId = this.accountId.replace(/-/g, '');
  var now = new Date();
  var file = accountId + '-aws-billing-csv-' +
    now.getFullYear() + '-' + pad(now.getMonth() + 1, 2) + '.csv';
  debug('getting S3 file %s ..', file);
  this.knox.getFile(file, function (err, stream) {
    if (err) return callback(err);
    debug('got S3 stream ..');
    csv()
      .from.stream(stream)
      .to.array(function (data) {
        var productCol = data[0].indexOf('ProductCode');
        var costCol = data[0].indexOf('TotalCost');
        var cost = data
          .filter(function (row) {
            return row[productCol] &&
                   row[productCol] !== 'AmazonEC2' &&
                   !isNaN(row[costCol]);
          })
          .reduce(function (memo, row) { return memo + parseFloat(row[costCol]); }, 0);
        var monthFraction = new Date().getDate() / 30;
        var rolling30DayCost = cost / monthFraction;
        debug('rolling 30 days non-ec2 cost: %d', rolling30DayCost);
        callback(err, rolling30DayCost);
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