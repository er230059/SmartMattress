var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var async = require('async');
var i2c = require('i2c');

app.use(function (req, res, next) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip + ': '+ req.url);
    next();
});

app.use(express.static(__dirname + '/static'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/static/index.html');
});

http.listen(80, function () {
    console.log('server listening on port 80');
});

var device = []
for(var i = 0; i < 10; i++) {
	device.push(new i2c(0x31 + i, {device: '/dev/i2c-1'}));
}

function formatData (id, res) {
    var json = {'id':id, 'data':[], 'status':[]};
    if(res[6].toString(16) != '78' || res[7].toString(16) != '48') {
        return null;
    }
    for(var i = 0; i < 6; i++) {
        if(res[i].toString(16) != 'a5') {
            return null;
        }
    }
    for(var i = 11; i < 75; i += 2) {
        var d1 = ('0' + res[i].toString(16)).slice(-2);
        var d0 = ('0' + res[i+1].toString(16)).slice(-2);
        json['data'].push('0x' + d1 + d0);
    }
    for(var i = 75; i < 79; i++) {
        var bData = ('0000000' + res[i].toString(2)).slice(-8);
        var bDataArray = bData.split('');
        for(var j = 0; j < bDataArray.length; j++) {
            json['status'].push(bDataArray[j]);
        }
    }
    return json;
}

setInterval(function () {
	var i = 0;
	var responseData = [];
	async.whilst(
	    function () {
	    	return i < device.length;
	    },
	    function (callback) {
	    	var index = i;
	    	i++;
	        device[index].write([0x78, 0x05, 0x00, 0x00, 0x00, 0x44, 0xc1], function (err) {
	            if(err) {
	            	console.log(err);
	            	callback(null);
	            } else {
		            device[index].read(0x50, function (err, res) {
		                if(err) {
		                	console.log(err);
		                	callback(null);
		                } else {
		                    var data = formatData(index, res);
		                    if(data) {
		                        responseData.push(data);
		                    }
		                    callback(null);
		                }
		            });
	            }
	        });
	    },
	    function (err) {
	    	if(err) {
	    		console.log(err);
	    	} else {
	    		io.emit('update', JSON.stringify(responseData));
	    	}
	    }
	);
}, 200);
