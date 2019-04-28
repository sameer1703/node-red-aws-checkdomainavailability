let v = require("./nestedvalidation");
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
let route53domains = new AWS.Route53Domains();
let validationSchema = {
	"required" : {"DomainName":"DomainName is required"},
	"isFQDN": {"DomainName": "Invalid domain"}
};
module.exports = function(RED) {
    function DomainAvailability(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
        	let result = v.validateform(msg.payload, validationSchema);
        	if (result.error) {
        		msg.statusCode = 400;
        		result.message = "Invalid Request Parameters";
        		result.data = null;
        		msg.payload = result;
        		node.send(msg);
        	} else {
        		let domainName = msg.payload.DomainName;
        		let params = {
	        		"DomainName": domainName
	        	};

	        	route53domains.checkDomainAvailability(params, function(err, data) {
					if (err) {
						console.log(err);
						msg.statusCode = err.statusCode;
						result.message = err.message;
        				msg.payload = result;
					} else {
						msg.statusCode = 200;
						result.data["Availability"] = data.Availability;
				  	}
				  	let suggestionParams = {
				  		"DomainName": domainName,
				  		"OnlyAvailable": true,
				  		"SuggestionCount": 10
				  	};
				  	route53domains.getDomainSuggestions(suggestionParams, function(error, suggestions){
				  		if (err) {
							msg.statusCode = err.statusCode;
							result.message = err.message;
	        				msg.payload = result;
						} else {
							msg.statusCode = 200;
							result.data["SuggestionsList"] = suggestions.SuggestionsList;
						}
						msg.payload = result;
						node.send(msg);
				  	});
				});

        	}
        });
    }
    RED.nodes.registerType("domain-availability",DomainAvailability);
}
