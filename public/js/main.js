window.audio = {bars: {}};

var app = angular.module('audioVisual', []);
app.controller('frequencyBars', function($scope) {
    window.frequencyBarsScope = $scope;

    function makeBar(d, a, s, side) {

        var $bar = $('<div class="audio-column ' + side + '"></div>' );
        $bar.attr('style', 'transform: rotate('+a+'deg) translate(0px, '+d+'px) scale('+1+', '+s*1+')');
        $( ".audio-visual-container" ).append($bar);

        return {
            d: d,
            r: 1,
            a: a,
            s: s,
            w: 1,
            $bar: $bar,
            side: side
        }
    }

    audio.bars.leftInner = _.range(181).map(function(i){ return makeBar(200, i, 1, 'left'); });
    audio.bars.rightInner = _.range(181).map(function(i){ return makeBar(200, -i, 1, 'right'); });

    audio.bars.leftOuter = _.range(181).map(function(i){ return makeBar(200, i, -1, 'left outer'); });
    audio.bars.rightOuter = _.range(181).map(function(i){ return makeBar(200, -i, -1, 'right outer'); });

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
        bar.$bar.attr('style', 'transform: rotate('+bar.a+'deg) translate(0px, '+bar.d+'px) scale('+bar.w+', '+bar.s*bar.r+')');
    });
};

window.audio.process = function(timestamp) {
    if(!frequencyBarsScope.playing){
        window.requestAnimationFrame(audio.process);
        return;
    }

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

    window.requestAnimationFrame(audio.process);
};

$(function(){
    audio.initialize();
    audio.loadBuffer('yt/yPhO3LmLKOM');
});
