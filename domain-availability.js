const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
let route53domains = new AWS.Route53Domains();
module.exports = function(RED) {
    function DomainAvailability(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
        	if (msg.payload.trim()) {
        		let domainName = msg.payload;
        		let params = {
	        		"DomainName": domainName
	        	};
	        	let payload = {"error": false,"Availability":"","SuggestionsList":[]};
	        	route53domains.checkDomainAvailability(params, function(err, data) {
					if (err) {
						msg.statusCode = 400;
        				msg.payload = {"error": true, errorMessage: JSON.stringify(err)};
        				node.send(msg);
					} else {
						payload.Availability = data.Availability;
				  	}
				  	let suggestionParams = {
				  		"DomainName": domainName,
				  		"OnlyAvailable": true,
				  		"SuggestionCount": 10
				  	};
				  	route53domains.getDomainSuggestions(suggestionParams, function(error, suggestions){
				  		if (err) {
							msg.statusCode = 400;
	        				msg.payload = {"error": true, errorMessage: JSON.stringify(err)};
	        				node.send(msg);
						} else {
							payload.SuggestionsList = suggestions.SuggestionsList;
						}
						msg.payload = payload;
						node.send(msg);
				  	});
				});
        	} else {
        		msg.statusCode = 400;
        		msg.payload = {"error": true, errorMessage: "Domain name is required."};
        		node.send(msg);
        	}
            // msg.payload = msg.payload.toLowerCase();
        });
    }
    RED.nodes.registerType("domain-availability",DomainAvailability);
}
