let v = require("./nestedvalidation");
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
let route53domains = new AWS.Route53Domains();
var mysql = require('mysql');

let validationSchema = {
    "required" : {
        "DomainName":"DomainName is required",
        "DurationInYears": "DurationInYears is required",
        "AdminContact.ContactType": "ContactType is required",
        "AdminContact.FirstName": "FirstName is required",
        "AdminContact.LastName": "LastName is required",
        "AdminContact.Email": "Email is required",
        "AdminContact.PhoneNumber": "PhoneNumber is required",
        "AdminContact.AddressLine1": "AddressLine1 is required",
        "AdminContact.AddressLine2": "AddressLine2 is required",
        "AdminContact.City": "City is required",
        "AdminContact.CountryCode": "CountryCode is required",
        "AdminContact.State": "State is required",
        "AdminContact.ZipCode":"ZipCode is required",

        "RegistrantContact.ContactType": "ContactType is required",
        "RegistrantContact.FirstName": "FirstName is required",
        "RegistrantContact.LastName": "LastName is required",
        "RegistrantContact.Email": "Email is required",
        "RegistrantContact.PhoneNumber": "PhoneNumber is required",
        "RegistrantContact.AddressLine1": "AddressLine1 is required",
        "RegistrantContact.AddressLine2": "AddressLine2 is required",
        "RegistrantContact.City": "City is required",
        "RegistrantContact.CountryCode": "CountryCode is required",
        "RegistrantContact.State": "State is required",
        "RegistrantContact.ZipCode":"ZipCode is required",

        "TechContact.ContactType": "ContactType is required",
        "TechContact.FirstName": "FirstName is required",
        "TechContact.LastName": "LastName is required",
        "TechContact.Email": "Email is required",
        "TechContact.PhoneNumber": "PhoneNumber is required",
        "TechContact.AddressLine1": "AddressLine1 is required",
        "TechContact.AddressLine2": "AddressLine2 is required",
        "TechContact.City": "City is required",
        "TechContact.CountryCode": "CountryCode is required",
        "TechContact.State": "State is required",
        "TechContact.ZipCode":"ZipCode is required",

        "dbhost": "Please configure dbhost",
        "dbname": "Please configure dbname",
        "dbusername": "Please configure dbusername",
        "dbpassword": "Please configure dbpassword"
    },
    "isFQDN": {"DomainName": "Invalid domain"},
    "isEmail": {
        "AdminContact.Email": "Invalid email",
        "RegistrantContact.Email": "Invalid email",
        "TechContact.Email": "Invalid email"
    }
};

module.exports = function(RED) {
    function RegisterDomain(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            
            let result = v.validateform(Object.assign(msg.payload,config), validationSchema);
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
                let params = msg.payload;
                route53domains.registerDomain(params, function(err, data) {
                    if (err) {
                        msg.statusCode = err.statusCode;
                        result.message = err.message;
                        msg.payload = result;
                        node.send(msg);
                    } else {
                        connection.query("INSERT INTO domains (domain, type, status, record_count, operationid, created_at, updated_at) VALUES('"+msg.payload.DomainName+"', 'public' 'SUBMITTED', 0, '"+data.OperationId+"', '"+new Date().toISOString().slice(0, 19).replace('T', ' ')+"','"+new Date().toISOString().slice(0, 19).replace('T', ' ')+"')", function(err, result){
                            msg.statusCode = 200;
                            result.data = result;
                            msg.payload = result;
                            node.send(msg);
                        });
                    }
                });    
            }
        });
    }
    RED.nodes.registerType("register-domain",RegisterDomain);
}
