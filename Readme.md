
# aws-billing

  A node API to learn how much your Amazon Web Services hosting costs.

## Installation

    $ npm install aws-billing

## Example

First, set up [programmatic billing access](http://docs.aws.amazon.com/awsaccountbilling/latest/about/programaccess.html).

```js
var accountId = '1111-2222-3333';
var key = 'DJ9289DSAKSI2938A';
var secret = 'b/4239+skdj292jd92jd29dj229';
var bucket = 'company-aws-billing';
var region = 'us-west-2';
```

Then you can query your billing cost:

```js
var billing = require('aws-billing')(accountId, key, secret, bucket, region);

billing(function (err, costs) {
    // ..
});
```

You may also optionally query an AWS Organizations "linked account", like so:

```js
var linkedAccountId = '9999-8888-7777';

var billing = require('aws-billing')(accountId, key, secret, bucket, region, linkedAccountId);

billing(function (err, costs) {
    // ..
});
```

And / or you can request the totals before any sales taxes are added, like so:

```js
var linkedAccountId = null; // we have no linked account
var withoutTaxes = true; // but we want pre-sales-tax totals

var billing = require('aws-billing')(accountId, key, secret, bucket, region, linkedAccountId, withoutTaxes);

billing(function (err, costs) {
    // ..
});
```

The `costs` variable shows the costs for the current billing period by product.

```js
{ total: 4839.25,
  start: Thu Jan 01 2015 00:00:00 GMT+0000 (UTC),
  end: Thu Jan 08 2015 02:34:50 GMT+0000 (UTC),
  products:
   { 'data transfer': 432.12,
     'elastic mapreduce': 864.43,
     'cloudfront': 124.42,
     'support (business)': 120.12,
     'elasticache': 124.12,
     'simple storage service': 172.46,
     'redshift': 423.77,
     'elastic compute cloud': 123.32,
     'route 53': 454.73 } }
```

## License

MIT
