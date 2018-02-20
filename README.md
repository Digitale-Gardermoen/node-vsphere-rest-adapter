# node-vsphere-rest-adapter
A REST middleware for connecting to vCenter 5.5, built in NodeJS

This product is still in late alpha stage, but it does run, connect and fetch VMs in the environment available to during the development. 

There is only support for fetching VMs at the moment. Fetching other resources like hosts, network etc. is on the TODO-list, but not a priority.

Feel free to fork the project and use it as you like. 

## How to use it as a REST server
- Clone the repo or download the files manually
- Run `npm install` to get the dependencies sorted out
- Set the following environment variables where Node can access them
  - VSPHERE_USERNAME <- Your vSphere API user, default `user`
  - VSPHERE_PASSWORD <- Your vSphere API password, default `password`
  - VSPHERE_HOST <- Your vSphere hostname, default `localhost`
  - VSPHERE_DEBUG <- Set to `true` if you want to enable some error logging to console, default `false`

## How to use it to explore vSphere in code
- Download `vmfetcher.js` to your application folder
- Include `var vmfetcher = require('./vmfetcher');`, and remember to adjust the path to your project
- If you can't use environment variables you need to use `vmfetcher.configure([username],[password],[host]);` to set the correct config
- Use one, or all, of:
  - vmfetcher.getAllVMs([handler]) <- Returns all VMs, unpaged.
  - vmfetcher.getVMByIp([ip],[handler]) <- Returns all VMs that has the supplied IP Address
  - vmfetcher.getVMByDns([dns name],[handler]) <- Returns all VMs that has the supplied DNS Name
  - vmfetcher.getVMByUuid([UUID],[handler]) <- Returns the VM that is uniqely identified by the supplied UUID

### Handler
The callback handler function for the methods above needs to be setup similar to this:
```javascript
function sendBackNodes(response) {
  return function (nodes) {
    response.header("Content-Type", "application/json");
    response.send(JSON.stringify(nodes));
    response.end();
  };
}
```
Here you see the the handler `sendBackNodes(response)` return an anonymous function taking a parameter `nodes`. This way, the returned function is made available to the `vmfetcher.js` methods for passing in the result of the queries, while still allowing it access to the `response` object. Otherwise, using both `nodes` and `response`, would proove tricky in the same scope.
