const express = require('express');

function keep_alive(){
	app = express();
	app.get('/', (req, res) => {
		res.send("Online!")
	});
	app.listen(8080);
}

module.exports = keep_alive;
require('./keep_alive.js');