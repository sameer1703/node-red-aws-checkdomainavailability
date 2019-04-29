let validator = require('validator');
let _ = require('lodash');

function validationMethod(data, field, type, message) {
	if (!_.isNil(data)){
		let fieldPart = field.split(".");
		let fieldVal = data;
		if (fieldPart.length > 0) {
			for(let i in fieldPart){
				if(!_.isNil(fieldVal[fieldPart[i]])){
					fieldVal = fieldVal[fieldPart[i]];
				} else {
					fieldVal = undefined;
					break;
				}
			}
		}
		if(type == "required"){
			if(_.isNil(fieldVal) || _.isEmpty(fieldVal+'')){
				return message;
			} else {
				return false;
			}
		}else{
			if(validator[type](fieldVal+'')){
				return false;
			} else {
				return message;
			}
		}
	}else{
		return message;
	}
}

module.exports = {
	validateform: function(data, form){
		let result = {
			"error" : false,
			"errors": {},
			"message": null,
			"data": {}
		};
		for(let i in form){
			for(let j in form[i]) {
				let validateData = validationMethod(data, j, i, form[i][j]);
				if(validateData){
					result.error = true;
					if(_.isNil(result.errors[j])){
						result.errors[j] = [];
						result.errors[j].push(validateData);
					} else {
						result.errors[j].push(validateData);
					}
				}
			}
		}
		return result;
	}
};
