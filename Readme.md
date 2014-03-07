
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

The `costs` variable estimates your 30 day rolling billing costs for ec2 and non-ec2 costs:

```js
{
    ec2: 13393,
    nonEc2: 2493,
    total: 15886
}
```

## License

MIT