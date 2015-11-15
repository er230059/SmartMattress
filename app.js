var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var async = require('async');;
var i2c = require('i2c');
var device30 = new i2c(0x30, {device: '/dev/i2c-1'});
var device31 = new i2c(0x31, {device: '/dev/i2c-1'});
var device32 = new i2c(0x32, {device: '/dev/i2c-1'});

app.use(function (req, res, next) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip + ': '+ req.url);
    next();
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/static/index.html');
});

http.listen(80, function () {
    console.log('server listening on port 80');
});

function formatData (ID, res) {
    var json = {id:ID, data:[], status:[]};
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
    var responseData = [];
    async.series([
        function (callback) {
            device30.write([0x78, 0x05, 0x00, 0x00, 0x00, 0x44, 0xc1], function (err) {
                    if(err) callback(err);
                    else callback(null);
            });
        },
        function (callback) {
            device30.read(0x50, function (err, res) {
                    if(err) callback(err);
                    else {
                        var data = formatData(0, res);
                        if(!data) {
                            callback(null);
                        }
                        else {
                            responseData.push(data);
                            callback(null);
                        }
                    }
            });
        },
        function (callback) {
            device31.write([0x78, 0x05, 0x00, 0x00, 0x00, 0x44, 0xc1], function (err) {
                    if(err) callback(err);
                    else callback(null);
            });
        },
        function (callback) {
            device31.read(0x50, function (err, res) {
                    if(err) callback(err);
                    else {
                        var data = formatData(1, res);
                        if(!data) {
                            callback(null);
                        }
                        else {
                            responseData.push(data);
                            callback(null);
                        }
                    }
            });
        },
        function (callback) {
            device32.write([0x78, 0x05, 0x00, 0x00, 0x00, 0x44, 0xc1], function (err) {
                    if(err) callback(err);
                    else callback(null);
            });
        },
        function (callback) {
            device32.read(0x50, function (err, res) {
                    if(err) callback(err);
                    else {
                        var data = formatData(2, res);
                        if(!data) {
                            callback(null);
                        }
                        else {
                            responseData.push(data);
                            callback(null);
                        }
                    }
            });
        },
        function (callback) {
            io.emit('update', JSON.stringify(responseData));
            callback(null);
        }
    ],function(err){
    	if(err) console.log(err);
	});
}, 200)
