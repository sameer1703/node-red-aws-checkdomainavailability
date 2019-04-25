const mustache = require("mustache");
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
let route53domains = new AWS.Route53Domains();
module.exports = function(RED) {
    function DomainStatus(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var operationid = config.operationid;
        var isTemplatedoperationid = (operationid||"").indexOf("{{") != -1;
        node.on('input', function(msg) {
            if(isTemplatedoperationid){
                operationid = mustache.render(operationid,msg);
            }
            let params = {
                "OperationId": operationid
            };
            route53domains.getOperationDetail(params, function(err, data) {
                if (err) {
                    msg.statusCode = 400;
                    msg.payload = {"error": true, errorMessage: JSON.stringify(err)};
                    node.send(msg);
                } else {
                    msg.statusCode = 200;
                    msg.payload = {"data":data};
                    node.send(msg);
                }
            });

        });
    }
    RED.nodes.registerType("domain-status",DomainStatus);
}
