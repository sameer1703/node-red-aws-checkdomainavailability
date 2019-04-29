let v = require("./nestedvalidation");
var mysql = require('mysql');
var pagination = require('api-pagination');

let validationSchema = {
    "required" : {
        "dbhost": "Please configure dbhost",
        "dbname": "Please configure dbname",
        "dbusername": "Please configure dbusername",
        "dbpassword": "Please configure dbpassword"
    }
};

module.exports = function(RED) {
    function ListDomains(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        let limit = config.limit || 10;
        let page = 1;
        let searchstr = "";
        let sort_by = "created_at";
        let sort = "DESC";
        let queryLimit = " LIMIT " + (parseInt((page-1))*limit) + ", " + limit;
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
                let params = msg.payload;

                let query = "SELECT id, domain, type, zone_id, status, record_count, comment FROM domains";
                let countQuery = "SELECT count(id) counts FROM domains"

                if(params.q){
                    query += " WHERE domain like '%"+params.q+"%'";
                    countQuery += " WHERE domain like '%"+params.q+"%'";
                    searchstr = params.q;
                }

                if(params.sort_by){
                    query += " ORDER BY "+params.sort_by;
                    countQuery += " ORDER BY "+params.sort_by;
                    sort_by = params.sort_by;
                } else {
                    query += " ORDER BY "+sort_by;
                    countQuery += " ORDER BY "+sort_by;
                }

                if(params.sort){
                    query += " "+params.sort;
                    countQuery += " "+params.sort;
                    sort = params.sort;
                }

                if(params.page){
                    query += " LIMIT " + (parseInt((params.page-1))*limit) + ", " + limit;
                    page = params.page;
                } else{
                    query += " LIMIT " + (parseInt((page-1))*limit) + ", " + limit;
                }

                connection.query(countQuery, function(err, data){
                    if(err){
                        msg.statusCode = 400;
                        result.message = err.sqlMessage;
                        result.error = true;
                        msg.payload = result;
                        node.send(msg);
                    } else {
                        console.log(data);
                        result.total = data[0].counts;
                        connection.query(query, function(err, data){
                            if(err){
                                msg.statusCode = 400;
                                result.message = err.sqlMessage;
                                result.error = true;
                                msg.payload = result;
                                node.send(msg);
                            } else {
                                result.data = data;
                                msg.statusCode = 200;
                                msg.payload = result;
                                node.send(msg);
                            }
                        });
                    }
                });
            }
            

        });
    }
    RED.nodes.registerType("list-domains",ListDomains);
}
