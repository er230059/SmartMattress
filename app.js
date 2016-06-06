require('console-stamp')(console, '[HH:MM:ss.l]');
var fs = require('fs');
var http = require('http');
var express = require('express');
var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);
var async = require('async');
var i2c = require('i2c');

const recordDataFolder = '/media/SD';

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/static'));
app.use('/record_data', express.static('/media/SD'));

app.use(function (req, res, next) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip + ': '+ req.url);
    next();
});

app.get('/getRecordData', function (req, res) {
    fs.readdir(recordDataFolder, function (err, data) {
        if(err) {
            console.log(err);
            res.status(500).end();
        } else {
            res.render('getRecordData', {'files': data});
        }
    });
});

server.listen(80, function () {
    console.log('server listening on port 80');
});

var device = []
for(var i = 0; i < 10; i++) {
    device.push(new i2c(0x31 + i, {device: '/dev/i2c-1'}));
}

function formatData (id, res) {
    var json = {'id':id, 'data':[], 'status':[]};
    if(res[6] != 0x78 || res[7] != 0x48) {
        return null;
    }
    for(var i = 0; i < 6; i++) {
        if(res[i] != 0xa5) {
            return null;
        }
    }
    for(var i = 11; i < 75; i += 2) {
        json['data'].push((res[i] * 256) + res[i+1]);
    }
    for(var i = 75; i < 79; i++) {
        var bData = ('0000000' + res[i].toString(2)).slice(-8);
        var bDataArray = bData.split('');
        for(var j = 0; j < bDataArray.length; j++) {
            json['status'].push(parseInt(bDataArray[j]));
        }
    }
    return json;
}

var record = false;
var recordDataPath = '';
io.on('connection', function (socket) {
    socket.on('cmd', function(data) {
        var json = JSON.parse(data);
        if(json.cmd == 'start_record') {
            var date = new Date();
            var year = date.getFullYear();
            var month = date.getMonth() + 1;
            var day = date.getDate();
            var hour = ('0' + date.getHours()).slice(-2);
            var minute = ('0' + date.getMinutes()).slice(-2);
            var second = ('0' + date.getSeconds()).slice(-2);
            var dateString = year + '-' + month + '-' + day + ' ' + hour + minute + second;
            recordDataPath = recordDataFolder + '/record_data.' + dateString + '.txt';
            record = true;
        } else if(json.cmd == 'stop_record') {
            record = false;
        }
        io.emit('recoed_state', JSON.stringify({'state': record}));
    });

    socket.on('get_recoed_state', function(data) {
      io.emit('recoed_state', JSON.stringify({'state': record}));
    });
});

setInterval(function () {
    var i = 0;
    var dataGroup = [];
    async.whilst(
        function () {
            return i < device.length;
        },
        function (callback) {
            var index = i;
            i++;
            device[index].write([0x78, 0x05, 0x00, 0x00, 0x00, 0x44, 0xc1], function (err) {
                if(err) {
                    console.error(err);
                    callback(null);
                } else {
                    device[index].read(0x50, function (err, res) {
                        if(err) {
                            console.error(err);
                            callback(null);
                        } else {
                            var data = formatData(index, res);
                            if(data) {
                                dataGroup.push(data);
                            } else {
                                var err = new Error("Data header incorrect");
                                console.error(err);
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
                if(record) {
                    if(device.length == dataGroup.length) {
                        var writeString = '';
                        for(var i = 0; i < dataGroup.length; i++) {
                            writeString += dataGroup[i].id + ':\n';
                            var data = '', status = '';
                            for(var j = 0; j < dataGroup[i].data.length; j++) {
                                data += dataGroup[i].data[j] + ' ';
                                status += dataGroup[i].status[j] + ' ';
                            }
                            writeString += data + '\n' + status + '\n\n';
                        }
                        writeString += 'Timestamp: ' + Date.now() + '\n\n==========================================\n';
                        fs.appendFileSync(recordDataPath, writeString);
                    } else {
                        var err = new Error("Data length not match, not record");
                        console.error(err);
                    }
                }

                var stringifyData = JSON.stringify(dataGroup);
                io.emit('update', stringifyData);
            }
        }
    );
}, 200);
