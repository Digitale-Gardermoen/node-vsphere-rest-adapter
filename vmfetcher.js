var nvs = require("node-vsphere-soap");

const DEBUG = process.env.VSPHERE_DEBUG || false;

var _username = process.env.VSPHERE_USERNAME || "user";
var _password = process.env.VSPHERE_PASSWORD || "password";
var _host = process.env.VSPHERE_HOST || "localhost";


const virtualMachineProperties = [
	"summary.config.annotation",
	"summary.guest.guestFullName",
	"summary.guest.ipAddress",
	"guest.guestState",
	"summary.guest.toolsStatus",
	"summary.guest.hostName",
	"summary.config.name",
	"summary.config.numCpu",
	"summary.config.memorySizeMB",
	"config.tools.toolsVersion",
	"summary.runtime.powerState",
	"summary.runtime.bootTime",
	"summary.runtime.connectionState",
	"summary.overallStatus",
	"summary.config.uuid"
];

exports.configure = (username, password, host) => {
	_username = username;
	_password = password;
	_host = host;
};

exports.getVMByIp = function(ip, callback){
	getVM(ip,findAllByIp, callback);
};

exports.getVMByDns = function(dns, callback){
	getVM(dns,findAllByDns, callback);
};

exports.getVMByUuid = function(uuid, callback){
	getVM(uuid,findAllByUuid, callback);
};

exports.getAllVMs = function(callback) {
	var client = new nvs.Client(_host, _username, _password, false);
	client.once("ready", function () {
		var rootFolder = client.serviceContent.rootFolder;
		var propertyCollector = client.serviceContent.propertyCollector;
		var viewManager = client.serviceContent.viewManager;
		createContainerView(client, viewManager, rootFolder, propertyCollector, function (result) {
			var containerView = result.returnval;
			var traversalSpec = createTraversalSpec();
			fetchVMProperties(containerView,traversalSpec,propertyCollector,client,callback);
		});
	});
};

function getVM(searchProp, searchMethod, callback) {
	var client = new nvs.Client(_host, _username, _password, false);
	client.once("ready", function () {
		var searchIndex = client.serviceContent.searchIndex;
		var propertyCollector = client.serviceContent.propertyCollector;
		searchMethod(client, searchIndex, searchProp, function (result) {
			var vm = result.returnval;
			if(vm instanceof Array){
				vm = vm.shift();
			}
			fetchVMProperties(vm , null, propertyCollector, client, function(nodes){
				callback(nodes);
			});
		});
	});
}

function fetchVMProperties(obj, traversalSpec, propertyCollector, client, callback) {
	var objSpec = createObjectSpec(obj, traversalSpec);
	var propSpec = createPropertySpec(virtualMachineProperties);
	var propertyFilterSpec = createPropertyFilterSpec(propSpec, objSpec);
	var options = createRetrieveOptions(propertyCollector, propertyFilterSpec);
	retrieveProperties(client, options, function (result) {
		var vms = result.returnval;
		var nodes = [];
		if(vms instanceof Array){
			vms.forEach(fetchVM(nodes));
		}
		else {
			var fn = fetchVM(nodes);
			fn(vms);
		}
		callback(nodes);
	});
}

function findAllByIp(client, searchIndex, ip, success){
	var args = {
		_this: searchIndex,
		ip: ip,
		vmSearch: true
	};
	var command = "FindAllByIp";
	findVM(client, command, args, success);
}

function findAllByDns(client, searchIndex, dns, success){
	var args = {
		_this: searchIndex,
		dnsName: dns,
		vmSearch: true
	};
	var command = "FindAllByDnsName";
	findVM(client, command, args, success);
}

function findAllByUuid(client, searchIndex, uuid, success){
	var args = {
		_this: searchIndex,
		uuid: uuid,
		vmSearch: true
	};
	var command = "FindAllByUuid";
	findVM(client, command, args, success);
}

function findVM(client, command, args, success, error) {
	client.runCommand(command, args)
		.once("result", success)
		.once("error", function (err) {
			if(DEBUG){
				console.log("create error\n\n", err);
				console.log("request:\n\n", client.client.lastRequest);
			}
			if(typeof(error) == "function"){
				error(err);
			}
		});
}

function createRetrieveOptions(propertyCollector, propertyFilterSpec) {
	return {
		_this: propertyCollector,
		specSet: [propertyFilterSpec],
	};
}

function fetchVM(nodes) {
	return function (vm) {
		var vmObj = {};
		var props = vm.propSet;
		if( props instanceof Array){
			props.forEach(function (prop) {
				var val = prop.val.$value;
				if( val === undefined){
					val = "";
				}
				vmObj[prop.name.split(".").pop()] = val;
			});				
		}
		else {
			vmObj[props.name.split(".").pop()] = props.val;
		}
		nodes.push(vmObj);
	};
}

function retrieveProperties(client, options, success, error) {
	client.runCommand("RetrieveProperties", options)
		.once("result", success)
		.once("error", function (err) {
			if(DEBUG){
				console.log("retrieveProperties error\n\n", err);
				console.log("request:\n\n", client.client.lastRequest);
			}
			if(typeof(error) == "function"){
				error(err);
			}
		});
}

function createPropertyFilterSpec(propertySpec, objectSpec) {
	return {
		attributes: { "xsi:type": "PropertyFilterSpec" },
		propSet: [propertySpec],
		objectSet: [objectSpec]
	};
}

function createPropertySpec(pathSet) {
	return {
		attributes: { "xsi:type": "PropertySpec" },
		type: "VirtualMachine",
		pathSet: pathSet
	};
}

function createObjectSpec(obj, traversalSpec) {
	var objSpec = {
		attributes: { "xsi:type": "ObjectSpec" },
		obj: obj,
		skip:false
	};
	if(traversalSpec){
		objSpec.skip = true;
		objSpec.selectSet = [traversalSpec];
	}
	return objSpec;
}

function createTraversalSpec() {
	return {
		attributes: { "xsi:type": "TraversalSpec" },
		name: "traverseEntities",
		type: "ContainerView",
		path: "view",
		skip: false,
	};
}

function createContainerView(client, viewManager, rootFolder, propertyCollector, success, error) {
	var args = {
		_this: viewManager,
		container: rootFolder,
		type: ["VirtualMachine"],
		recursive: true
	};
	client.runCommand("CreateContainerView", args)
		.once("result", success )
		.once("error", function (err) {
			if(DEBUG){
				console.log("create error\n\n", err);
				console.log("request:\n\n", client.client.lastRequest);
			}
			if(typeof(error) == "function"){
				error(err);
			}
		});
}
