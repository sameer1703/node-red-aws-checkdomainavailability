let v = require("./nestedvalidation");
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
let acm = new AWS.ACM();

let validationSchema = {
    "required" : {
        "DomainName": "DomainName is required",
        "ValidationMethod": "ValidationMethod is required",
        "wclient_id": "wclient_id is required",

        "dbhost": "Please configure dbhost",
        "dbname": "Please configure dbname",
        "dbusername": "Please configure dbusername",
        "dbpassword": "Please configure dbpassword"
    },
    "isFQDN": {"DomainName": "Invalid domain"}
};
module.exports = function(RED) {
    function RequestSSL(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            let current_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
            let result = v.validateform(Object.assign(config, msg.payload), validationSchema);
            if (result.error) {
                msg.statusCode = 400;
                result.message = "Invalid Request Parameters";
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
                let params = {
                    "DomainName": msg.payload.DomainName,
                    "ValidationMethod": msg.payload.ValidationMethod
                };
                acm.requestCertificate(params, function(err, data) {
                    if (err) {
                        msg.statusCode = err.statusCode;
                        result =  {"error": true, errorMessage: err.message};
                        msg.payload = result;
                        node.send(msg);
                    } else {
                        let query = "INSERT INTO `certificates` (wclient_id, domain, certificatearn, validation_method, status, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?)";
                        connection.query(query, [msg.payload.wclient_id, msg.payload.DomainName, data.CertificateArn, msg.payload.ValidationMethod,current_date], function(err, mysqlresult){
                            if(err) {
                                msg.statusCode = 400;
                                result.message = err.sqlMessage;
                                result.error = true;
                                msg.payload = result;
                                node.send(msg);
                            } else {
                                msg.statusCode = 200;
                                result.data = mysqlresult;
                                msg.payload = result;
                                node.send(msg);
                            }
                        });
                    }
                });
            }
            
            // node.send(msg);
        });
    }
    RED.nodes.registerType("request-certificate",RequestSSL);
}
