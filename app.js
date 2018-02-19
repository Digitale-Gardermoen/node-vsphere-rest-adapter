var vmfetcher = require("./vmfetcher");
var express = require("express");
var bodyParser = require("body-parser").json();

var app = express();
var port = process.env.PORT || 8081;

app.use(bodyParser);

// routes will go here
app.get("/api/vms", isValidCreds, function(req, res) {

	if(!req.query){
		vmfetcher.getAllVMs(sendBackNodes(res));	
	}
	else if(req.query.ip){
		vmfetcher.getVMByIp(req.query.ip,sendBackNodes(res));	
	}
	else if(req.query.dns){
		vmfetcher.getVMByDns(req.query.dns,sendBackNodes(res));	
	}
});

app.get("api/vm/:uuid", isValidCreds, function(req,res){
	vmfetcher.getVMByUuid(req.params.uuid,sendBackNodes(res));	
});

app.get("/api/hosts", isValidCreds, function(req, res){
	// TODO: duplicate vmfetcher functionality for fetching hosts
	// For now, just return the clients request data as we see it
	res.end(req.query);
});


// start the server
app.listen(port);
console.log("Server started at http://localhost:" + port);

function sendBackNodes(res) {
	return function (nodes) {
		nodes.forEach(function (vm) {
			vm.type = "VM";
		});
		res.header("Content-Type", "application/json");
		res.send(JSON.stringify(nodes));
		res.end();
	};
}

function isValidCreds(req,res, next){

	// TODO: Add support for a proper Key management solution
	var apiKey = "abc123";
	var secretKey = "Abc123";
	
	var key = req.headers["api-key"];
	var secret = req.headers["secret-key"];

	if(key && key == apiKey && secret && secret == secretKey){
		console.log("Authorized");
		next();
	}
	else {
		res.status(401);
		res.end("Unauthorized");
	}
}