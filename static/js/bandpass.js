function filter (orinigInput) {
	var input = orinigInput.slice();
	var output = [];

	var b = [0.05644846226074, 0, -0.1128969245215, 0, 0.05644846226074];
	var a = [3.159463302119,  -3.792684422851, 2.082573317184,  -0.450445430056];

	var x = [0, 0, 0, 0, 0];
	var y = [0, 0, 0, 0, 0];
	var y1, y2;

	var min = Math.min.apply(null, input);
	for(var i = 0; i < input.length; i++)
	{
		input[i] -= min;
	}

	x[0] = input[0];
	for(var i = 0; i < input.length - 1; i++)
	{
	    y1 = 0;
	    for(var j = 0; j < 5; j++)
	    {
	        var temp = x[j] * b[j];
	        y1 = y1 + temp;
	    }
	    y2 = 0;
	    for(var j = 0; j < 4; j++)
	    {
	        var temp = y[j] * a[j];
	        y2 = y2 + temp;
	    }
	    y1 = y1 + y2;
	    output.push(y1);
	    for(var j = 1; j <= 4; j++)
	    {
	        x[5 - j] = x[4 - j];
	    }
	    for(var j = 1; j <= 3; j++)
	    {
	        y[4 - j] = y[3 - j];
	    }
	    x[0] = input[i + 1];
	    y[0] = y1;
	}
	return output;
}