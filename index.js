const path = require("path");
const snoowrap = require("snoowrap");
//const token = require("./token.json");
const snoostorm = require("snoostorm");

const r = new snoowrap(process.env);

//subreddit = snoowrap.subreddit("")

const csv = require("csv-parser");
const fs = require("fs");
const Database = require('@replit/database');
const db = new Database();
const keep_alive = require("./keep_alive.js");

const nodeModulesPath = path.join(__dirname, "node_modules");

var sleeping = false;

function installDeps() {
	console.log("Installing dependencies, please wait...");
	execSync("npm install --only=prod", {
		cwd: __dirname,
		stdio: [null, null, null],
	});
	console.log("Dependencies successfully installed!");
	//powercord.pluginManager.remount(__dirname);
}

if (!fs.existsSync(nodeModulesPath)) {
	installDeps();
	//return;
}

function clean_string(input) {
	return input
		.toLowerCase()
		.replace(/([^a-z\d\s]+)/g, " ")
		.replace(/(\s+)/g, " ");
}

function getRndInteger(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const divmod = (x, y) => [Math.floor(x / y), x % y];

function sleep(ms) {
	setTimeout(function () {
		sleeping = false;
	}, ms);
}

class RedditBot {
	constructor(filename) {
		this.response_list = [];
		if (!db.length){
		this.csvToArray(filename);
		  db['response_list'] = this.response_list
		} else{
		    console.log("Pulling from DB");
		    this.response_list = db['response_list'];
		}
	}
	csvToArray(filename) {
		return new Promise((res) => {
			fs.createReadStream(filename)
				.pipe(csv(["phrase", "reply1", "reply2", "reply3", "reply4"]))
				.on("data", (data) => {
					res(data);
					this.response_list.push(data);
				})
				.on("end", (data) => {
					////	console.log(JSON.stringify(this.response_list));	\\\\
					startBot();
				});
		});
	}
	async findMatch(comment) {
		if (comment.author.name == "ItsLapisBot_v2" || comment.author.name == "sneakpeekbot") {
			return;
		}
		console.log("finding match");
		for (let i = 0; i < this.response_list.length; i++) {
			console.log(i);
			if (
				clean_string(comment.body).includes(
					clean_string(this.response_list[i]["phrase"])
				)
			) {
				console.log("match found!");
				if (this.cooled_down(i)) {
					console.log("no cool down! starting to make reply!");
					this.make_reply(i, comment);
					break;
				}
				break;
			}
		}
	}

	cooled_down(i) {
		var dictionary = this.response_list[i];
		console.log("cooled_down" + JSON.stringify(this.response_list[i]));
		if (!Object.keys(dictionary).includes("last_posted")) {
			// Means we have never posted on this phrase!
			return true;
		} else {
			var now = new Date();
			var duration = new Date(now) - new Date(dictionary["last_posted"]);
			var duration_seconds = new Date(duration).getTime() / 1000;
			var hours = divmod(duration_seconds, 3600)[0];
			if (hours >= 24) {
				return true;
			} else {
				console.log(
					"Couldn't post " +
						dictionary["phrase"] +
						"Cool Down time: " +
						(24 - hours)
				);
			}
		}
		return false;
	}

	make_reply(i, comment) {
		var dictionary = this.response_list[i];
		try {
			var x = getRndInteger(1, 4);
			comment.reply(dictionary["reply" + x]);
			console.log("replying to: " + comment.body);
			console.log("found this: " + dictionary["phrase"]);
			console.log("replying with: " + dictionary["reply" + x]);
			// Might want to sleep after posting!
			sleeping = true;
			sleep(60 * 60 * 3 * 1000);
		} catch (e) {
			console.log(e);
		}

		var now = new Date();
		this.response_list[i]["last_posted"] = now;
		db['response_list'] = this.response_list;
	}
}

// Warning clears all your posted times!
// Use if you want to changes phrases replies
//db.clear()
keep_alive();
bot = new RedditBot("response_list.csv");
console.log("creating bot done");
function startBot() {
	console.log("starting bot");
	const comments = new snoostorm.CommentStream(r, {
		subreddit: "BeachCity+memeuniverse+stevenuniverse+stevenuniversejerk+SULeaks",
		limit: 10,
		pollTime: 2000,
	});
	comments.on("item", function (item) {
		console.log("================================");
		console.log(item.body);
		if (!sleeping) {
			bot.findMatch(item);
		}
		console.log("================================");
	});
}
