var Hangman = new Mn.Application();

// send request function
Hangman.sendRequest = function (options) {
	
	// prepare params
	var params = { 
		"sessionId": options.sessionId, 
		"action" : options.action
	};
	if (options.action == 'guessWord') {
		params.guess = options.letter;
	}
	if (options.action == 'startGame') {
		delete params.sessionId;
		params.playerId = options.playerId;
	}
	
	// send request
	new Backbone.Model()
	.fetch({
		url: 'https://secretUrl',
		type: "POST",
		data: JSON.stringify(params)
	})
	.done(function (response) {
		switch (options.action) {
			case 'nextWord':
				Hangman.trigger("gotNewWord", response);
				break;
			case 'guessWord':
				Hangman.trigger("guessMade", response);
				break;
			case 'getResult':
				Hangman.trigger("showResults", response);
				break;
			case 'startGame':
				Hangman.trigger("newGameStarted", response);
				break;
			case 'submitResult':
				alert('done');
				location.reload();
				break;
		}
	})
	.error(function (message) {
		alert('API query failed :(');
	});
}

/******scoreboard******/
Hangman.ScoreboardModel = Backbone.Model.extend({
	defaults: {
		numberOfWordsToGuess: 0,
		numberOfAttempts: 0,
		totalWordCount: 0,
		score: 0
	}
});
Hangman.ScoreboardView = Backbone.Marionette.ItemView.extend({
	el: "#scoreboard",
	template: _.template($('#scoreboardTemplate').html()),
	onRender: function () {
		this.model.on("change", this.render);
	}
});

/******word******/
Hangman.WordModel = Backbone.Model.extend({
	defaults: {
		word: '***'
	}
});
Hangman.WordView = Backbone.Marionette.ItemView.extend({
	el: '#word',
	template: _.template($('#wordTemplate').html()),
	onRender: function () {
		this.model.on("change", this.render);
	}
});

/******keyboard******/
Hangman.KeyboardView = Backbone.Marionette.ItemView.extend({
	el: '#keyboard',
	template: '#keyboardTemplate',
	events: {
		"click td": "makeGuess"
	},
	makeGuess: function (e) {
		var $key = $(e.currentTarget);
		if ($key.html() == '@') {
			Hangman.sendRequest({ action: "submitResult", sessionId: this.options.sessionId });
		} else {
			if (Hangman.scoreboard.get("numberOfAttempts") > 0) {
				if ($key.html() && !$key.hasClass("used")) {
					Hangman.sendRequest({ action: "guessWord", letter: $key.html(), sessionId: this.options.sessionId });
					$key
						.unbind()
						.html("")
						.addClass("used");
				}
			}
		}
	}
});

/**********LISTENERS***********/
Hangman.on("showResults", function (results) {
	Hangman.scoreboard.set("score", results.data.score);
});

// Guess has been made
Hangman.on("guessMade", function (guessData) {
	
	if (guessData.data.wrongGuessCountOfCurrentWord == 10 || guessData.data.word.indexOf("*") == -1) {
		Hangman.sendRequest({ action: "nextWord", sessionId: guessData.sessionId });
		Hangman.sendRequest({ action: "getResult", sessionId: guessData.sessionId });
	} else {
		Hangman.scoreboard.set({
			"totalWordCount": guessData.data.totalWordCount,
			"numberOfAttempts": Hangman.numberOfGuessAllowedForEachWord - guessData.data.wrongGuessCountOfCurrentWord
		});
		Hangman.word.set("word", guessData.data.word);
	}
});

// New word has received
Hangman.on("gotNewWord", function (nextWordData) {
	
	// initialize keyboard
	if(!Hangman.keyboardViewInstance) {
		Hangman.keyboardViewInstance = new Hangman.KeyboardView({"sessionId": nextWordData.sessionId });
	}
	Hangman.keyboardViewInstance.render();
	
	// initialize word
	if(!Hangman.wordViewInstance) {
		Hangman.word = new Hangman.WordModel({ 
			word: nextWordData.data.word 
		});
		Hangman.wordViewInstance = new Hangman.WordView({ 
			model: Hangman.word
		});
	}
	Hangman.word.set("word", nextWordData.data.word);
	Hangman.wordViewInstance.render();
	
	// update scoreboard
	Hangman.scoreboard.set({
		"totalWordCount": nextWordData.data.totalWordCount,
		"numberOfAttempts": Hangman.numberOfGuessAllowedForEachWord
	});
	
});

// New game started
Hangman.on("newGameStarted", function (newGameData) {
	
	Hangman.numberOfGuessAllowedForEachWord = newGameData.data.numberOfGuessAllowedForEachWord;
	
	// initialize model for scoreboard
	Hangman.scoreboard = new Hangman.ScoreboardModel({
		numberOfWordsToGuess: newGameData.data.numberOfWordsToGuess,
		numberOfAttempts: newGameData.data.numberOfGuessAllowedForEachWord
	});
	
	// render scoreboard
	new Hangman.ScoreboardView({
		model: Hangman.scoreboard
	})
	.render();
	
	// get new word
	Hangman.sendRequest({ "action": "nextWord", "sessionId": newGameData.sessionId });
	
});

// game started
Hangman.on("start", function(options){	
	Hangman.sendRequest({ "action": "startGame", "playerId": "*****@*****.***" });
});

Hangman.start();