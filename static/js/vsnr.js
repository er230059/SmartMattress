const thACT = 5;

var ctRST = true;
var rstTimer = setTimeout(rstCtRST, 15000);

var nData = []; //index 0 = t-2, 1 = t-1, 2 = t(latest)
var vsnr = {};
var plusData = true;

function rstCtRST() {
	ctRST = false;
	for(var i in vsnr) {
		for(var j = 0; j < vsnr[i].length; j++){
			if(parseInt(nData[2][i]['status'][j]) == 1 && parseInt(nData[1][i]['status'][j]) == 1 && parseInt(nData[0][i]['status'][j]) == 1) {
				vsnr[i][j] = Infinity;
			}
		}
	}
}

var socket = io();

socket.on('update', function (data) {
	var json = JSON.parse(data);

	if(ctRST) {
		for(var i = 0; i < json.length; i++) {
			for(var j = 0; j < json[i]['data'].length; j++) {
				json[i]['data'][j] += (plusData ? 1 : -1);
			}
		}
		plusData = !plusData;
	}

	nData.push(json);
	if(nData.length > 3) {
		nData.shift();
	}
	if(ctRST && nData.length >= 3) {
		for(var i = 0; i < nData[0].length; i++) {
			for(var j = 0; j < nData[0][i]['data'].length; j++) {
				var nValue = [], nStatus =[ ]; //index 0=t-2, 1=t-1, 2=t(latest)
				for(var k = 0; k < 3; k++) {
					nValue.push(parseInt(nData[k][i]['data'][j]));
				}

				vsnr[nData[0][i]['id']] = vsnr[nData[0][i]['id']] || [];
				if((nValue[1] - nValue[0] < 0) && (nValue[2] - nValue[1] > 0)) {
					vsnr[nData[0][i]['id']][j] = vsnr[nData[0][i]['id']][j] + 1 || 1; //first dimensional = sensor_id, second = index(channel) in sensor_id
				} else {
					vsnr[nData[0][i]['id']][j] = vsnr[nData[0][i]['id']][j] || 0;
				}
			}
		}
	}
	if(nData.length >= 2) {
		var nPressed = 0, lnPressed = 0;
		for(var i = 0; i < nData[nData.length - 1].length; i++) {
			for(var j = 0; j < nData[nData.length - 1][i]['data'].length; j++) {
				if(nData[nData.length - 1][i]['status'][j] == 1) {
					nPressed += 1;
				}
				if(nData[nData.length - 2][i]['status'][j] == 1) {
					lnPressed += 1;
				}
			}
		}
		if(Math.abs(nPressed - lnPressed) > thACT) {
			if(rstTimer) {
				clearTimeout(rstTimer);
				rstTimer = undefined;
			}
			vsnr = {};
			ctRST = true;
			rstTimer = setTimeout(rstCtRST, 15000);
		}
	}
});