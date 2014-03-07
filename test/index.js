
var assert = require('assert');
var Billing = require('..');

describe('aws-billing', function () {

  var accountId = '1111-2222-3333';
  var key = 'DJ9289DSAKSI2938A';
  var secret = 'b/4239+skdj292jd92jd29dj229';
  var bucket = 'company-aws-billing';
  var region = 'us-west-2';

  describe('#get', function () {
    this.timeout(30000); // aws takes a while
    it('should get the aws bill', function (done) {
      var billing = Billing(accountId, key, secret, bucket, region);
      billing(function (err, costs) {
        if (err) return done(err);
        assert(costs);
        assert(costs.total);
        done();
      });
    });
  });
});