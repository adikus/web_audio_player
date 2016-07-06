window.audio = {bars: {}};

var app = angular.module('audioVisual', []);
app.controller('frequencyBars', function($scope) {
    window.frequencyBarsScope = $scope;

    function makeBar(d, a, s, side, ring) {
        return {
            d: d,
            r: 1,
            a: a,
            s: s*6,
            w: 1,
            side: side,
            ring: ring
        };
    }

    audio.bars.leftInner = _.range(181).map(function(i){ return makeBar(400, i, -1, 'left', 'inner'); });
    audio.bars.rightInner = _.range(181).map(function(i){ return makeBar(400, -i, -1, 'right', 'inner'); });

    audio.bars.leftOuter = _.range(181).map(function(i){ return makeBar(400, i, 1, 'left', 'outer'); });
    audio.bars.rightOuter = _.range(181).map(function(i){ return makeBar(400, -i, 1, 'right', 'outer'); });

    $scope.playing = false;
    $scope.seekTo = null;
    $scope.bufferLoaded = false;

    $scope.playPause = function() {
        if($scope.playing){
            audio.stop();
            $scope.stoppedAt = audio.getCurrentTime();
            $scope.playing = false;
        }else{
            audio.play($scope.stoppedAt || 0);
            $scope.playing = true;
        }
    };

    $scope.seek = function() {
        audio.play($scope.seekTo || 0);
        $scope.playing = true;
    };

    $scope.loadBuffer = function() {
        audio.loadBuffer($scope.bufferName, function() {
            audio.play(0);
            $scope.playing = true;
        });
        audio.stop();
        $scope.playing = false;
    };
});

window.audio.initialize = function() {
    this.tag = $('audio')[0];
    this.context = new AudioContext();
    this.sourceNode = this.context.createMediaElementSource(this.tag);

    this.canvas = $('canvas')[0];
    this.ctx = this.canvas.getContext("2d");

    this.analysers = {};
    this.addAnalyzer('left', 0.75);
    this.addAnalyzer('right', 0.75);
    this.splitter = this.context.createChannelSplitter();

    this.splitter.connect(this.analysers.left, 0, 0);
    this.splitter.connect(this.analysers.right, 1, 0);

    this.sourceNode.connect(this.splitter);
    this.sourceNode.connect(this.context.destination);

    window.requestAnimationFrame(this.process);
};

window.audio.addAnalyzer = function(key, smoothing) {
    this.analysers[key] = this.context.createAnalyser()
    this.analysers[key].smoothingTimeConstant = smoothing;
};

window.audio.loadBuffer = function(filename, cb) {
    var self = this;

    audio.tag.src = filename;
    frequencyBarsScope.bufferLoaded = false;
    this.tag.oncanplay = function() {
        frequencyBarsScope.bufferLoaded = true;
        frequencyBarsScope.$apply();
        console.log('Buffer', filename, 'loaded.');
        if(cb) cb();
        self.tag.oncanplay = null;
    };
};

window.audio.play = function(position) {
    position = parseFloat(position);

    this.tag.currentTime = position || 0;
    this.tag.play();

    var length = this.tag.duration;
    frequencyBarsScope.totalMinutes = Math.floor(length / 60);
    frequencyBarsScope.totalSeconds = Math.floor(length % 60);
};

window.audio.stop = function() {
    this.tag.pause();
};

window.audio.getCurrentTime = function() {
    return this.tag.currentTime;
};

window.audio.getFrequencyData = function(key) {
    if(!this.analysers[key])return;
    var array =  new Uint8Array(this.analysers[key].frequencyBinCount);
    this.analysers[key].getByteFrequencyData(array);
    return array;
};

window.audio.history = {left: {}, right: {}};

window.audio.assignBarValues = function(array, start, scale, side, bars) {
    var l = bars.length;
    var barValues = [];
    var colorValues = [];

    var current = 0;
    var currentColor = 0;
    var j = 0;
    for(var i = start; barValues.length <= l; i++){
        if(!audio.history[side][i])audio.history[side][i] = [];
        audio.history[side][i].push(array[i]);
        if(audio.history[side][i].length > 20)audio.history[side][i].shift();

        current += array[i];
        currentColor += Math.abs(array[i] - _(audio.history[side][i]).mean());
        j ++;
        if(j == scale){
            barValues.push(current/scale);
            colorValues.push(currentColor/scale);
            current = 0;
            currentColor = 0;
            j = 0;
        }
    }
    var average = _(barValues).mean();
    var averageColor = _(colorValues).mean();
    if(average < 1){
        barValues = _(l).times(_.constant(0));
    }

    _(bars).each(function(bar, i){
        bar.r = 1 + Math.max(0, barValues[i] - average/1.1)/5.0;
        bar.w = 0.75 + average/128;
        audio.drawBar(bar, colorValues[i] - averageColor/1.1);
    });
};

window.audio.prevDelta = 0;
window.audio.process = function(currentDelta) {
    window.requestAnimationFrame(audio.process);
    if(!frequencyBarsScope.playing || !document.hasFocus()){
        return;
    }

    var delta = currentDelta - audio.prevDelta;
    if (delta < 1000 / 45){
        return;
    }
    audio.prevDelta = currentDelta;

    audio.ctx.clearRect(0, 0, 1200, 1200);

    var left = audio.getFrequencyData('left');
    audio.assignBarValues(left, 0, 1, 'left', audio.bars.leftInner);
    audio.assignBarValues(left, 181, 2, 'left', audio.bars.leftOuter);


    var right = audio.getFrequencyData('right');
    audio.assignBarValues(right, 0, 1, 'right', audio.bars.rightInner);
    audio.assignBarValues(right, 181, 2, 'right', audio.bars.rightOuter);

    var currentTime = audio.getCurrentTime();
    frequencyBarsScope.currentMinutes = Math.floor(currentTime / 60);
    frequencyBarsScope.currentSeconds = Math.floor(currentTime % 60);
    frequencyBarsScope.$apply();
};

window.audio.drawBar = function(bar, color) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.translate(600, 600);
    this.ctx.rotate((bar.a + 90) * Math.PI / 180);
    this.ctx.translate(bar.d, 0);
    this.ctx.rect(0, 0, bar.s*bar.r, bar.w*2);
    this.ctx.fillStyle = bar.ring == 'outer' ? 'rgb('+Math.round(255 - color)+', '+Math.round(125 + color*4)+', 0)' : 'rgb('+Math.round(255 - color)+', 0, '+Math.round(color*4)+')';
    this.ctx.fill();
    this.ctx.restore();
};

$(function(){
    audio.initialize();
    //audio.loadBuffer('yt/yPhO3LmLKOM');
    audio.loadBuffer('audio/panzer_vor.mp3');
});
