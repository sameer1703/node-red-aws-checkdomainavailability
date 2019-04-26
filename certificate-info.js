const mustache = require("mustache");
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
let acm = new AWS.ACM();
module.exports = function(RED) {
    function GetSSLInfo(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var certificatearn = config.certificatearn;
        var isTemplatedcertificatearn = (certificatearn||"").indexOf("{{") != -1;
        node.on('input', function(msg) {
            if(isTemplatedcertificatearn){
                certificatearn = mustache.render(certificatearn,msg);
            }
            let params = {
                "CertificateArn": certificatearn
            };
            acm.describeCertificate(params, function(err, data) {
                if (err) {
                    msg.statusCode = 400;
                    msg.payload = {"error": true, errorMessage: JSON.stringify(err), "data": null};
                    node.send(msg);
                } else {
                    msg.statusCode = 200;
                    msg.payload = {"error":false,"data":data};
                    node.send(msg);
                }
            });

        });
    }
    RED.nodes.registerType("certificate-info",GetSSLInfo);
}
