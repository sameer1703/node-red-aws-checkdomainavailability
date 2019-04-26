const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
let acm = new AWS.ACM();
module.exports = function(RED) {
    function RequestSSL(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            let params = msg.payload;
            acm.requestCertificate(params, function(err, data) {
                if (err) {
                    msg.statusCode = 400;
                    msg.payload = {"error": true, errorMessage: JSON.stringify(err)};
                    node.send(msg);
                } else {
                    msg.statusCode = 200;
                    msg.payload = {"error": false, "data": data};
                    node.send(msg);
                }
            });
            node.send(msg);
        });
    }
    RED.nodes.registerType("request-certificate",RequestSSL);
}
