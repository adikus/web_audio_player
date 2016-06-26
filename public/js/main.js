window.audio = {bars: {}};

var app = angular.module('audioVisual', []);
app.controller('frequencyBars', function($scope) {
    window.frequencyBarsScope = $scope;
    $scope.bars = [];

    function makeBar(d, a, s, side) {
        return {
            d: d,
            r: 1,
            a: a,
            s: s,
            w: 1,
            side: side
        }
    }

    audio.bars.leftInner = _.range(181).map(function(i){ return makeBar(200, i, 1, 'left'); });
    audio.bars.rightInner = _.range(181).map(function(i){ return makeBar(200, -i, 1, 'right'); });

    audio.bars.leftOuter = _.range(181).map(function(i){ return makeBar(200, i, -1, 'left outer'); });
    audio.bars.rightOuter = _.range(181).map(function(i){ return makeBar(200, -i, -1, 'right outer'); });

    _(audio.bars.leftInner).each(function(bar){ $scope.bars.push(bar); });
    _(audio.bars.rightInner).each(function(bar){ $scope.bars.push(bar); });

    _(audio.bars.leftOuter).each(function(bar){ $scope.bars.push(bar); });
    _(audio.bars.rightOuter).each(function(bar){ $scope.bars.push(bar); });

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
    if(this.sourceNode){
        this.sourceNode.stop();
    }
    if(this.javascriptNode){
        this.javascriptNode.disconnect();
    }
    if(this.context){
        this.context.close();
    }
    this.context = new AudioContext();
    this.javascriptNode = this.context.createScriptProcessor(2048, 1, 1);
    this.javascriptNode.connect(this.context.destination);

    this.analysers = {};
    this.addAnalyzer('left', 0.75);
    this.addAnalyzer('right', 0.75);
    this.splitter = this.context.createChannelSplitter();

    this.splitter.connect(this.analysers.left, 0, 0);
    this.splitter.connect(this.analysers.right, 1, 0);

    this.analysers.left.connect(this.javascriptNode);

    this.javascriptNode.onaudioprocess = this.process;
};

window.audio.addAnalyzer = function(key, smoothing) {
    this.analysers[key] = this.context.createAnalyser()
    this.analysers[key].smoothingTimeConstant = smoothing;
};

window.audio.loadBuffer = function(filename, cb) {
    var request = new XMLHttpRequest();
    request.open('GET', filename, true);
    request.responseType = 'arraybuffer';
    frequencyBarsScope.bufferLoaded = false;

    var self = this;

    request.onload = function() {
        if(!self.context){
            self.context = new AudioContext();
        }
        self.context.decodeAudioData(request.response, function(buffer) {
            self.currentBuffer = buffer;
            frequencyBarsScope.bufferLoaded = true;
            frequencyBarsScope.$apply();
            console.log('Buffer', filename, 'loaded.');
            if(cb) cb();
        });
    };
    request.send();
};

window.audio.play = function(position) {
    position = parseFloat(position);
    this.initialize();

    this.sourceNode = this.context.createBufferSource();
    this.sourceNode.connect(this.splitter);
    this.sourceNode.connect(this.context.destination);

    this.sourceNode.buffer = this.currentBuffer;
    this.sourceNode.start(0, position || 0);
    this.currentStartTime = position || 0;

    var length = audio.sourceNode.buffer.duration;
    frequencyBarsScope.totalMinutes = Math.floor(length / 60);
    frequencyBarsScope.totalSeconds = Math.floor(length % 60);
};

window.audio.stop = function() {
    this.sourceNode.stop();
};

window.audio.getCurrentTime = function() {
    return this.currentStartTime + this.context.currentTime;
};

window.audio.getFrequencyData = function(key) {
    if(!this.analysers[key])return;
    var array =  new Uint8Array(this.analysers[key].frequencyBinCount);
    this.analysers[key].getByteFrequencyData(array);
    return array;
};

window.audio.assignBarValues = function(array, start, scale, bars) {
    var l = bars.length;
    var barValues = [];

    var current = 0;
    var j = 0;
    for(var i = start; barValues.length <= l; i++){
        current += array[i];
        j ++;
        if(j == scale){
            barValues.push(current/scale);
            current = 0;
            j = 0;
        }
    }
    var average = _(barValues).mean();
    if(average < 1){
        barValues = _(l).times(_.constant(0));
    }

    _(bars).each(function(bar, i){
        bar.r = 1 + Math.max(0, barValues[i] - average/1.1)/5.0;
        bar.w = 0.75 + average/128;
    });
};

window.audio.process = function() {
    if(!frequencyBarsScope.playing)return;

    var left = audio.getFrequencyData('left');
    audio.assignBarValues(left, 0, 1, audio.bars.leftInner);
    audio.assignBarValues(left, 181, 2, audio.bars.leftOuter);


    var right = audio.getFrequencyData('right');
    audio.assignBarValues(right, 0, 1, audio.bars.rightInner);
    audio.assignBarValues(right, 181, 2, audio.bars.rightOuter);

    var currentTime = audio.getCurrentTime();
    frequencyBarsScope.currentMinutes = Math.floor(currentTime / 60);
    frequencyBarsScope.currentSeconds = Math.floor(currentTime % 60);

    frequencyBarsScope.$apply();
};

$(function(){
    audio.loadBuffer('audio/panzer_vor.mp3');
});
