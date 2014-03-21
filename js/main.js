//Initialize function
var init = function () {
    // TODO:: Do your initialization job
    console.log("init() called");

    // add eventListener for tizenhwkey
    document.addEventListener('tizenhwkey', function(e) {
        if(e.keyName == "back")
            tizen.application.getCurrentApplication().exit();
    });
};
$(document).bind('pageinit', init);

var DEBUG = false;

var io;
var grid;

var blockSize;

var width = 720;
var height = 1280;

var border = 35;
var topBorder = 150;

var num_width = 6;
var num_height = 6;

var colors = ["#ef3f3f", "#F3A96C", "#415d92", "#56C256", "#a459c8"];
var background_color = "#e9e9e9";

var buttonSize = 100;
var buttons = [];

var checkedFields;

var moves = 0;
var movesText = "";

var gameActive = true;
var gamePaused = false;

function initGrid(io){
	this.io = io;
	
	// Debugging
//	localStorage.clear();
	
	io.setBGColor(background_color);
	io.addGroup('lines', 5);
	io.addGroup('templine', 6);

	//Create Grid
	var maxWidthHeight = (num_width < num_height) ? num_width : num_height;
    var blockSizeX = Math.round((width-2*border)/maxWidthHeight);
    
    var maxHeight = height - topBorder*2 - buttonSize*2;
    var blockSizeY = Math.round((maxHeight-2*border)/maxWidthHeight);
    
    blockSize = (blockSizeX < blockSizeY) ? blockSizeX : blockSizeY;
    
    var fieldHeightWidth = num_height * blockSize;
    var gridPaddingTopBottom = (height-fieldHeightWidth)/2;
    

   	//New Constructor added in Github distrib
    grid = io.addObj(new iio.Grid(border, gridPaddingTopBottom, num_width, num_height, blockSize));
   	
    grid.setStrokeStyle(background_color);
    
    addMenu();
    
    addTouch();
    
    fillWithRandom();
    
    addTimerString();
    addScoreString();
    
    addButtons();
    
    moves = num_width+num_height+1;
    
    io.setFramerate(60, function(){
		io.canvas.draw(io.context);
    });
}
//
function addMenu(){
    io.addGroup('foreground', 10);
    io.addGroup('score', 11);
    
    var top = new iio.SimpleRect(new iio.Vec(720/2, 50), width, 100).setFillStyle("#d2d8d0");
	io.addToGroup('foreground', top);
	
	var bottom = new iio.SimpleRect(new iio.Vec(720/2, height-50), width, 100).setFillStyle("#d2d8d0");
	io.addToGroup('foreground', bottom);
}
var showLine = false;
var isDrag = false;
var touchStart = {x:0, y:0};

var activatedSquares = [];
//
function addTouch(){
	var touchable = document.getElementById("c_body");
	
	io.canvas.addEventListener("touchstart", function(e){
		var x = e.touches.item(0).screenX;
		var y = e.touches.item(0).screenY;
		
//		console.log("touched down");
		handleTouchDown(x, y);
	}, false);
	io.canvas.addEventListener("touchmove", function(e){
		var x = e.touches.item(0).screenX;
		var y = e.touches.item(0).screenY;
		
		handleTouchMove(x, y);
	}, false);
	io.canvas.addEventListener("touchend", function(e){
		var x = e.changedTouches.item(0).screenX;
		var y = e.changedTouches.item(0).screenY;
		
		handleTouchUp(x, y);
	}, false);
	
	///////////////
	if(DEBUG){
		io.canvas.addEventListener('mousedown', function(event) {
			var x = event.x;
			var y = event.y;
	    	
			console.log("mousedown");
			handleTouchDown(x, y);
		});
		io.canvas.addEventListener('mousemove', function(event) {
			var x = event.x;
			var y = event.y;
			
			handleTouchMove(x, y);
	
		});
		io.canvas.addEventListener('mouseup', function(event) {
			var x = event.x;
			var y = event.y;
			
			handleTouchUp(x, y);
		});
	}
}
//////////////
//  TOUCH	//
//////////////
var isSquare = false;

function handleTouchDown(x, y){
	isDrag = true;
	
	var touched = getTouchedSquare(x, y);
	if(touched && gameActive){
		activatedSquares.push(touched);
	}
	wasButtonPressed(x, y);
}
function handleTouchMove(x, y){
	if(isDrag && activatedSquares.length > 0){
		var oldSquare = activatedSquares[activatedSquares.length-1];
		
		drawTempLine(oldSquare, x, y);
		
		var touched = getTouchedSquare(x, y);
		
		if(touched && touched.color == oldSquare.color){
			// logical XOR
			if(	(touched.c == oldSquare.c-1 && touched.r == oldSquare.r) ^ (touched.c == oldSquare.c+1 && touched.r == oldSquare.r) ^ 
				(touched.r == oldSquare.r-1 && touched.c == oldSquare.c) ^ (touched.r == oldSquare.r+1 && touched.c == oldSquare.c)){	
				drawLine(touched, oldSquare);
				
				if($.inArray(touched, activatedSquares) === -1){
					activatedSquares.push(touched);
				}
				else {
					if(activatedSquares[activatedSquares.length-1] !== touched){
						isSquare = true;
					}
				}
			}
		}
	}
}
function handleTouchUp(x, y){
	isDrag = false;
	if(gameActive){
		handleScoring();
	}
	
	activatedSquares = [];
	isSquare = false;
}
//
function getTouchedSquare(x, y){
	var c = grid.getCellAt(new iio.Vec(x, y));
	if(c){
		return grid.cells[c.x][c.y];
	}
	else {
		return c;
	}
}
//
function createSquare(y, x, color, fadeIn){
	var rect = new iio.SimpleRect(grid.getCellCenter(x,y), (blockSize-60)).setFillStyle(color).setAlpha(1);
	grid.cells[x][y] = io.addObj(rect);
	grid.cells[x][y].color = color;
	grid.cells[x][y].r = y;
	grid.cells[x][y].c = x;
	
	if(fadeIn){
		grid.cells[x][y].setAlpha(0.1).fadeIn(.05);
	}
}
//
function fillWithRandom(){
	for(var i=0; i < grid.R; i++){
		for(var j=0; j < grid.C; j++){
			var color = colors[Math.floor(Math.random() * colors.length)];
			createSquare(i, j, color);
		}
	}
}
//
function drawLine(startSquare, endSquare){
	io.rmvFromGroup('templine');
	var line = new iio.Line(startSquare.pos, endSquare.pos).setStrokeStyle(startSquare.color, 13);
	line = io.addToGroup('lines', line);
}
var tempLine;

function drawTempLine(startSquare, targetX, targetY){
	if(!tempLine){
		tempLine = new iio.Line(startSquare.pos, new iio.Vec(targetX, targetY)).setStrokeStyle(startSquare.color, 13);
		tempLine = io.addToGroup('templine', tempLine);
	}
	else {
		tempLine.endPos = new iio.Vec(targetX, targetY);
	}
}
//
function removeLines(){
	io.rmvFromGroup('templine');
	io.rmvFromGroup('lines');
	tempLine = null;
}
//
function handleScoring(){
	removeLines();
	
	var toAddScore = 0;
	var multiplier = 0;
	
	// fade
	if(activatedSquares.length>1){
		for(var i=0; i < activatedSquares.length; i++){
			var square = activatedSquares[i];
			io.rmvObj(square);
			grid.cells[square.c][square.r] = null;
			toAddScore += 1;
		}
	}
	
	if(isSquare){
		var color = activatedSquares[0].color;
		
		for(var i=0; i < grid.C; i++){
			for(var j=0; j < grid.R; j++){
				if(grid.cells[i][j] && grid.cells[i][j].color == color){
					var square = grid.cells[i][j];
					grid.cells[i][j] = null;
					toAddScore += 1;
					multiplier++;
					
					io.rmvObj(square);
				}
			}
		}
	}
	
	toAddScore *= (activatedSquares.length-1 + multiplier);
	
	var emptyPosArray = [];
	// nachrutschen
	for(var i=0; i < grid.C; i++){
		for(var j=grid.R-1; j >= 0; j--){
			if(!grid.cells[i][j]){
				emptyPosArray.push(new iio.Vec(i, j));
			}
			if(grid.cells[i][j-1] && emptyPosArray.length > 0){
				var lowestPos = emptyPosArray.shift();
				
				grid.cells[i][lowestPos.y] = grid.cells[i][j-1];
				grid.cells[i][lowestPos.y].r = lowestPos.y;
				grid.cells[i][lowestPos.y].pos = grid.getCellCenter(i, lowestPos.y);
				grid.cells[i][j-1] = null;
				
			}
		}
		// die leeren Felder mit neuen Kreisen füllen
		
		if(emptyPosArray.length > 0){
			
			for(var j=0; j < emptyPosArray.length; j++){
				var toFillPos = emptyPosArray[j].y;
				
				var color = colors[Math.floor(Math.random() * colors.length)];
				createSquare(toFillPos, i, color, true);
			}
		}

		emptyPosArray = [];
	}
	updateScoreString(toAddScore);
}

//////////////////
var audioManager = {
	muteAudio : function(){
		localStorage.setItem('isMuted', "true");
	},
	unmuteAudio : function(){
		localStorage.removeItem('isMuted');
	},
	isMuted : function(){
		return localStorage.getItem("isMuted");
	}
}
//////////////////
var scoreManager = {
	addScore : function(newScore){
		var newHighScore = false;
		var highscore;
		if(localStorage["score"]){
			highscore = JSON.parse(localStorage["score"]);
		}
		else {
			highscore = [];
		}
		
		if(highscore && highscore.length !== undefined && highscore.length > 0){
			for(var i=0; i < highscore.length; i++){
				if(newScore > highscore[i]){
					newHighScore = true;
					console.log(highscore);
					highscore.splice(i, 0, newScore);
					
					if(highscore.length > 10){
						highscore.pop();
					}
					break;
				}
			}
			if(!newHighScore && highscore.length < 10){
				highscore.push(newScore);
			}
		}
		else {
			newHighScore = true;
			highscore = [1000];
			highscore.push(newScore);
		}
		localStorage["score"] = JSON.stringify(highscore);
		return newHighScore;
	},
	getScore : function(){
		if(localStorage["score"]){
			return JSON.parse(localStorage["score"]);
		}
		else {
			localStorage["score"] = JSON.stringify(new Array(1000));
			return JSON.parse(localStorage["score"]);
		}
	}
}
//////////////////

var timerStart = 60;
var timerText;
var counter = setInterval(timer, 1000); //1000 will  run it every 1 second

function timer(){
	if(!gamePaused){
		timerStart--;
	}
	
	if (timerStart < 0){
		clearInterval(counter);
		//counter ended, do something here
     
		handleGameOver();
		return;
	}

	if(timerText){
		timerText.text = ""+timerStart;
	}
	else {
		addTimerString();
	}
	//Do code for showing the number of seconds here
}
function handleGameOver(){
	gameActive = false;
	
	var newHighscore = scoreManager.addScore(score);
	drawScoreWindow(newHighscore);
}
//
function addTimerString(){
	timerText = new iio.Text("60", new iio.Vec(width/4, 65)).setFillStyle('black').setTextAlign('center').setFont('45px Consolas');
	io.addToGroup('foreground', timerText);
}
var score = 0;
var scoreString;
//
function addScoreString(){
	scoreString = new iio.Text(""+score, new iio.Vec((width/4)*3, 65)).setFillStyle('black').setTextAlign('center').setFont('45px Consolas');
	io.addToGroup('foreground', scoreString);
}
function updateScoreString(toAddScore){
	score += toAddScore;
	scoreString.text = ""+score;
}
function pauseGame(){
	gamePaused = true;
}
function unPauseGame(){
	gamePaused = false;
}
function resetGame(){
	clearWindows();
	removeLines();
	io.rmvFromGroup(0);
	fillWithRandom();
	
	gameActive = true;
	gamePaused = false;
	timerStart = 60;
	timerText.text = timerStart;
	score = 0;
	isSquare = false;
	activatedSquares = [];
	isDrag = false;
	clearInterval(counter);
	counter = setInterval(timer, 1000); //1000 will  run it every 1 second
	
	var myAudio = document.getElementById('background_song');
	myAudio.currentTime = 0;
	
	if(!audioManager.isMuted()){
		myAudio.play();
	}
}
//////////////
function clearWindows(){
	io.rmvFromGroup("score");
	
	infoOpen = false;
	scoreOpen = false;
	highScoreOpen = false;
}
var infoOpen = false;
function drawinfoWindow(){
	infoOpen = true;
	var infoWindow = new iio.SimpleRect(new iio.Vec(720/2, height/2), width-border*2, 300).setFillStyle("#373836");
	io.addToGroup('score', infoWindow);
	
	var string = "You're playing Squares!";
	var infoString = new iio.Text(string, new iio.Vec(720/2, height/2-50)).setFillStyle('white').setTextAlign('center').setFont('35px Consolas');
	io.addToGroup('score', infoString);
	
	var string = "The Song is AlexBeroza - Drive";
	var infoString = new iio.Text(string, new iio.Vec(720/2, height/2+50)).setFillStyle('white').setTextAlign('center').setFont('35px Consolas');
	io.addToGroup('score', infoString);
}
var scoreOpen = false;
function drawScoreWindow(newHighscore){
	scoreOpen = true;
	var infoWindow = new iio.SimpleRect(new iio.Vec(720/2, height/2), width-border*2, 300).setFillStyle("#373836");
	io.addToGroup('score', infoWindow);
	
	var string;
	if(!newHighscore){
		var string = "Your Score is "+score;
	}
	else {
		var string = "New Highscore "+score+"!";
	}
	
	var infoString = new iio.Text(string, new iio.Vec(720/2, height/2-50)).setFillStyle('white').setTextAlign('center').setFont('35px Consolas');
	io.addToGroup('score', infoString);
	
	var string = "Touch replay to try again!";
	var infoString = new iio.Text(string, new iio.Vec(720/2, height/2+50)).setFillStyle('white').setTextAlign('center').setFont('35px Consolas');
	io.addToGroup('score', infoString);
}
var highScoreOpen = false;
function drawHighScoreWindow(){
	highScoreOpen = true;
	var infoWindow = new iio.SimpleRect(new iio.Vec(720/2, height/2), width-border*2, 300).setFillStyle("#373836");
	io.addToGroup('score', infoWindow);
	
	var infoString = new iio.Text("Highscore", new iio.Vec(720/2, height/2-105)).setFillStyle('white').setTextAlign('center').setFont('35px Consolas');
	io.addToGroup('score', infoString);
	
	
	var highscore = scoreManager.getScore();
	
	var xPos = 720/2-120;
	var counter = 0;
	for(var i=0; i < highscore.length; i++){
		if(i == 5){
			xPos = 720/2+120;
			counter = 0;
		}
		
		var string = ""+highscore[i];
		var infoString = new iio.Text(string, new iio.Vec(xPos, height/2-50+counter*43)).setFillStyle('white').setTextAlign('center').setFont('35px Consolas');
		io.addToGroup('score', infoString);
		
		counter++;
	}
}
//////////////
function addButtons(){
	var mute_icon = new iio.SimpleRect(new iio.Vec(78, height-50)).createWithImage("./img/mute.png").setImgSize('native');
	io.addToGroup('foreground', mute_icon);
	
	var info_icon = new iio.SimpleRect(new iio.Vec(width/2-95, height-50)).createWithImage("./img/info.png").setImgSize('native');
	io.addToGroup('foreground', info_icon);
	
	var score_icon = new iio.SimpleRect(new iio.Vec(width/2+95, height-50)).createWithImage("./img/highscore.png").setImgSize('native');
	io.addToGroup('foreground', score_icon);
	
	var replay_icon = new iio.SimpleRect(new iio.Vec(width-78, height-50)).createWithImage("./img/replay.png").setImgSize('native');
	io.addToGroup('foreground', replay_icon);
}
//
function wasButtonPressed(x, y){
	if((height-100) < y){
		if(30 <= x && x <= 126){	// mute
			console.log("mute");
			// TODO zeit start fixen
			var myAudio = document.getElementById('background_song');
			
			if(!audioManager.isMuted()){
				audioManager.muteAudio();
				myAudio.pause();
			}
			else {
				audioManager.unmuteAudio();
				myAudio.currentTime = timerStart;
				myAudio.play();
			}
		}
		else if (217 <= x && x <= 313){	// info
			if(infoOpen){
				clearWindows();
			}
			else {
				drawinfoWindow();
			}
		}
		else if (407 <= x && x <= 503){	// highscore
			if(highScoreOpen){
				clearWindows();
			}
			else {
				drawHighScoreWindow();
			}
		}
		else if(594 <= x && x <= 690){	// replay
			resetGame();
		}
	}
}