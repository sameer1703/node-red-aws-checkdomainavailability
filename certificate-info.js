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

                let query = "SELECT certificatearn FROM certificates WHERE id = "+msg.payload.id;
                connection.query(query, function(err, data){
                    if(err) {
                        msg.statusCode = 400;
                        result.message = err.sqlMessage;
                        result.error = true;
                        msg.payload = result;
                        node.send(msg);
                    } else {
                        if(data.length > 0){
                            let certificatearn = data[0].certificatearn;
                            let params = {
                                "CertificateArn": certificatearn
                            };
                            acm.describeCertificate(params, function(err, data) {
                                if (err) {
                                    msg.statusCode = err.statusCode;
                                    result.error =  true;
                                    result.message = err.message;
                                    msg.payload = result;
                                    node.send(msg);
                                } else {
                                    msg.statusCode = 200;
                                    result.data = data;
                                    result.error = false;
                                    msg.payload = result;
                                    node.send(msg);
                                }
                            });
                        }else{
                            msg.statusCode = 400;
                            result.message = "No certificate found";
                            result.error = true;
                            msg.payload = result;
                            node.send(msg);
                        }
                    }
                });
            }
        });
    }
    RED.nodes.registerType("certificate-info",GetSSLInfo);
}
