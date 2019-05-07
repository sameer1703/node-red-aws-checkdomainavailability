let v = require("./nestedvalidation");
var mysql = require('mysql');

let validationSchema = {
    "required" : {
        "id": "id is required",

        "dbhost": "Please configure dbhost",
        "dbname": "Please configure dbname",
        "dbusername": "Please configure dbusername",
        "dbpassword": "Please configure dbpassword"
    }
};

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

            let result = v.validateform(Object.assign(config, msg.payload), validationSchema);
            if (result.error) {
                msg.statusCode = 400;
                result.message = "Invalid Request Parameters or configuration missing";
                result.data = null;
                msg.payload = result;
                node.send(msg);
            } else {
                var connection = mysql.createConnection({
                    host     : config.dbhost,
                    user     : config.dbusername,
                    password : config.dbpassword,
                    database : config.dbname
                });

                let query = "SELECT operationid FROM domains WHERE id = "+msg.payload.id;
                connection.query(query, function(err, data){
                    if(err) {
                        msg.statusCode = 400;
                        result.message = err.sqlMessage;
                        result.error = true;
                        msg.payload = result;
                        node.send(msg);
                    } else {
                        if(data.length > 0){
                            let operationid = data[0].operationid;
                            let params = {
                                "OperationId": operationid
                            };
                            route53domains.getOperationDetail(params, function(err, data) {
                                if (err) {
                                    msg.statusCode = 400;
                                    result.error = true;
                                    result.message = err.message;
                                    msg.payload = result;
                                    node.send(msg);
                                } else {
                                    msg.statusCode = 200;
                                    result.error = false;
                                    result.data = data;
                                    msg.payload = result;
                                    node.send(msg);
                                }
                            });
                        } else {
                            msg.statusCode = 400;
                            result.message = "No domain found";
                            result.error = true;
                            msg.payload = result;
                            node.send(msg);
                        }
                    }
                });
            }            

        });
    }
    RED.nodes.registerType("domain-status",DomainStatus);
}
