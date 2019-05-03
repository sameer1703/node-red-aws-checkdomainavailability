let v = require("./nestedvalidation");
var generator = require('generate-password');
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const rds = new AWS.RDS();
var mysql = require('mysql');
let validationSchema = {
    "required" : {
        "wclient_id": "wclient_id is required",
        "name": "name is required",
        "username": "username is required",
        "password": "password is required",

        "dbhost": "Please configure dbhost",
        "dbname": "Please configure dbname",
        "dbusername": "Please configure dbusername",
        "dbpassword": "Please configure dbpassword"
    }
};

module.exports = function(RED) {
    function CreateDB(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            let result = v.validateform(Object.assign(config, msg.payload), validationSchema);
            if (result.error) {
                msg.statusCode = 400;
                result.message = "Invalid Request Parameters";
                result.data = null;
                msg.payload = result;
                node.send(msg);
            } else {
                let connection = mysql.createConnection({
                    host     : config.dbhost,
                    user     : config.dbusername,
                    password : config.dbpassword,
                    database : config.dbname
                });
                let dbclustername = "app-db-cluster-"+msg.payload.wclient_id;
                let masterdbname = "masterdb"+msg.payload.wclient_id;
                let dbname = msg.payload.wclient_id+"_"+msg.payload.name;
                let masterpassword = generator.generate({ length: 16, numbers: true, symbols: true, uppercase: true, exclude: '/"@' });
                let masterusername = "appdbusr"+msg.payload.wclient_id;
                let params = msg.payload;
                let current_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
                connection.query("SELECT * FROM database_clusters where wclient_id = " + msg.payload.wclient_id, function(err, data) {
                    if(err){
                        msg.statusCode = 400;
                        result.message = err.sqlMessage;
                        result.error = true;
                        msg.payload = result;
                        node.send(msg);
                    } else {
                        if (data.length > 0){
                            let clusterDetail = data[0];
                            console.log(clusterDetail);
                        } else {
                            params = {
                                "DBClusterIdentifier": dbclustername,
                                "Engine": "aurora",
                                "AvailabilityZones":["us-east-1"],
                                "BackupRetentionPeriod":2,
                                "DBSubnetGroupName":"wsuitedb",
                                "DatabaseName": masterdbname,
                                "DeletionProtection": true,
                                "EngineMode":"serverless",
                                "EngineVersion":"5.6.10a",
                                "MasterUsername": masterusername,
                                "MasterUserPassword": masterpassword,
                                "Port":3306,
                                "PreferredBackupWindow":"00:00-08:00",
                                "ScalingConfiguration":{
                                    "AutoPause": true,
                                    "MinCapacity": 2,
                                    "MaxCapacity": 256,
                                    "SecondsUntilAutoPause": 600
                                },
                                "VpcSecurityGroupIds":["sg-0bd57b74"]
                            };
                            rds.createDBCluster(params, function(err, data){
                                if(err) {
                                    msg.statusCode = err.statusCode;
                                    result.message = err.message;
                                    result.error = true;
                                    msg.payload = result;
                                    node.send(msg);
                                } else{
                                    let createclusterquery = "INSERT INTO database_clusters (wclient_id, name, username, password, endpoint, jsondata, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)";
                                    connection.query(createclusterquery,[msg.payload.wclient_id, dbclustername, masterusername, masterpassword, data.DBCluster.Endpoint, JSON.stringify(data), current_time, current_time], function(err, data){
                                        if(err){
                                            msg.statusCode = 400;
                                            result.message = err.sqlMessage;
                                            result.error = true;
                                            msg.payload = result;
                                            node.send(msg);
                                        } else {
                                            let cluster_id = data.insertId;
                                            let createdbquery = "INSERT INTO `databases` (database_cluster_id, wclient_id, name, created_at, updated_at) VALUES(?,?,?,?,?)";
                                            connection.query(createdbquery,[cluster_id, msg.payload.wclient_id, dbname, current_time, current_time], function(err, data){
                                                if(err){
                                                    msg.statusCode = 400;
                                                    result.message = err.sqlMessage;
                                                    result.error = true;
                                                    msg.payload = result;
                                                    node.send(msg);
                                                } else {
                                                    msg.statusCode = 200;
                                                    result.message = "Database is created";
                                                    result.data = { "database_id": data.insertId };
                                                    result.error = false;
                                                    msg.payload = result;
                                                    node.send(msg);
                                                }

                                                
                                            });    
                                        }
                                        
                                    });
                                }
                            });
                        }
                    }
                });
            }
        });
    }
    RED.nodes.registerType("create-database",CreateDB);
}