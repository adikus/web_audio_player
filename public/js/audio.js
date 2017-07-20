Audio = function($audio, $canvas, $scope) {
    this.setupCanvas($canvas);
    this.setupAudio($audio);

    this.gui = $scope;
};

Audio.prototype.targetFPS = 80;
Audio.prototype.diffTimings = [0.25, 0.5, 1, 2];

Audio.prototype.setupCanvas = function($canvas) {
    this.$canvas = $canvas;
    this.ctx = this.$canvas[0].getContext("2d");
};

Audio.prototype.resize = function(height) {
    this.height = height;

    this.$canvas.width(this.height);
    this.$canvas.height(this.height);
    this.$canvas.attr('width', this.height*2);
    this.$canvas.attr('height', this.height*2);

    this.bars.leftInner = this.addBars(215, -1, 'left', 'inner');
    this.bars.rightInner = this.addBars(215, -1, 'right', 'inner');
    this.bars.leftOuter = this.addBars(325, 1, 'left', 'outer');
    this.bars.rightOuter = this.addBars(325, 1, 'right', 'outer');

    // Setup bar history
    var self = this;
    self.barHistory = {};
    ['left', 'right'].forEach(function(side) {
        self.barHistory[side] = {};
        for(var i = 0; i < 215+325+1; i++){
            self.barHistory[side][i] = {};
            self.diffTimings.forEach(function(targetTime) {
                self.barHistory[side][i][targetTime] = new CQueue(targetTime * self.targetFPS);
            })
        }
    });

    this.process(this.prevDelta + 1000/this.targetFPS + 1, true);
};

Audio.prototype.analysers = {};
Audio.prototype.setupAudio = function($audio) {
    this.tag = $audio[0];

    var self = this;
    this.tag.addEventListener("error", function(e) {
        console.log('Error when loading track', e);
    });

    this.context = new AudioContext();
    this.sourceNode = this.context.createMediaElementSource(this.tag);

    this.addAnalyzer('left', 0.75);
    this.addAnalyzer('right', 0.75);
    this.splitter = this.context.createChannelSplitter();

    this.splitter.connect(this.analysers.left, 0, 0);
    this.splitter.connect(this.analysers.right, 1, 0);

    this.sourceNode.connect(this.splitter);
    this.sourceNode.connect(this.context.destination);

    this.tag.onended = function() {
        self.gui.playing = false;
        if(self.gui.playingFromPlaylist() && !self.gui.stopAfterCurrent){
            if(!self.gui.playNext())self.tag.currentTime = 0;
        }else{
            self.tag.currentTime = 0;
        }
        self.gui.setCurrentTime(0, 1);
        localStorage.setItem('last_position', 0);
        self.gui.$apply();
    };
};

Audio.prototype.bars = {};
Audio.prototype.addBars = function(n, s, side, ring) {
    var self = this;
    return _.range(n).map(function(i){ return self.makeBar(self.height/1.5, (side == 'left' ? 1 : -1)*(i+0.5)/n*180, s, ring == 'inner' ? 1 : 0.5, side, ring); });
};

Audio.prototype.makeBar = function(d, a, s, w, side, ring) {
    return {
        d: d,
        r: 1,
        a: a,
        s: s*this.height/100,
        w: w*this.height/600,
        side: side,
        ring: ring
    };
};

Audio.prototype.addAnalyzer = function(key, smoothing) {
    this.analysers[key] = this.context.createAnalyser()
    this.analysers[key].smoothingTimeConstant = smoothing;
};

Audio.prototype.loadBuffer = function(filename, cb) {
    var self = this;

    this.tag.src = filename;
    this.gui.loading = true;
    this.tag.oncanplay = function() {
        self.gui.loading = false;
        console.log(filename, 'loaded.');
        localStorage.setItem('last_played', filename);

        if(cb) cb();
        self.gui.setDuration(self.tag.duration);
        self.process(1000, true);
        self.gui.$apply();
        self.tag.oncanplay = null;
    };
};

Audio.prototype.seek = function(position) {
    this.tag.currentTime = parseFloat(position) || 0;
};

Audio.prototype.play = function () {
    this.tag.play();
    this.gui.playing = true;
};

Audio.prototype.pause = function () {
    this.tag.pause();
    this.gui.playing = false;
};

Audio.prototype.stop = function () {
    this.pause();
    this.seek(0);
};

Audio.prototype.playPause = function() {
    if(this.tag.paused){
        this.play();
    }else{
        this.pause();
    }
};

Audio.prototype.getFrequencyData = function(key) {
    if(!this.analysers[key])return;
    var array =  new Uint8Array(this.analysers[key].frequencyBinCount);
    this.analysers[key].getByteFrequencyData(array);
    return array;
};

Audio.prototype.timings = {
    assignBarValues: new CQueue(120),
    process: new CQueue(120),
    barValues: new CQueue(120),
    colorValues: new CQueue(120),
    averages: new CQueue(120),
    drawBars: new CQueue(120)
};

Audio.prototype.debugTime = function(key, cb) {
    var start = new Date();
    cb.apply(this);
    var end = new Date();
    this.timings[key].add(end.getTime() - start.getTime());
};

Audio.prototype.assignBarValues = function(array, start, scale, side, bars) {
    var self = this;

    var barValues = this.getScaledValues(array, start, scale, side, bars.length, function(v) { return v; });
    var colorValues = this.getScaledValues(array, start, scale, side, bars.length, function(v, i) {
        self.saveBarHistory(side, start + i, v, 2);
        var diffSum = 0;
        for(var j = 0; j < self.diffTimings.length; j++){
            var targetTime = self.diffTimings[j];
            var queue = self.barHistory[side][start + i][targetTime];
            diffSum += Math.max(0.1, v - queue.sum / queue.size)
        }
        return diffSum / self.diffTimings.length;
    });

    var average = _(barValues).mean();
    this.saveHistory(side, 'average-'+start, average, 2);
    var windowedAverage = _(this.history[side]['average-'+start]).mean();
    var maxColor = Math.max(_(colorValues).max(), 20);

    _(bars).each(function(bar, i){
        bar.r = 1 + Math.max(0, barValues[i] - (windowedAverage+average)/2.2)/5.0;
        bar.w = 0.25 + average/100;
        self.drawBar(bar, colorValues[i]/maxColor*40);
    });
};

Audio.prototype.getScaledValues = function(array, start, scale, side, length, cb) {
    if(scale == 1){
        return _(array.slice(start, start + length)).map(function(v, i) { return cb(v, i); }).value();
    }else{
        return _(array.slice(start, start + length * scale)).map(function(v, i) {
            return [cb(v, i), i]
        }).groupBy(function(v) {
            return Math.floor(v[1]/scale);
        }).values().map(function(values) {
            return _(values).map(function(v){ return v[0]; }).mean();
        }).value();
    }
};

Audio.prototype.saveBarHistory = function(side, i, value) {
    var self = this;
    for(var j = 0; j < self.diffTimings.length; j++){
        var targetTime = self.diffTimings[j];
        self.barHistory[side][i][targetTime].add(value);
    }
};

Audio.prototype.history = {left: {}, right: {}};
Audio.prototype.saveHistory = function(side, i, value, targetTime) {
    if(!this.history[side][i])this.history[side][i] = [];
    this.history[side][i].push(value);
    if(this.history[side][i].length > this.targetFPS*targetTime)this.history[side][i].shift();
};

Audio.prototype.requestAnimationFrame = function() {
    var self = this;
    window.requestAnimationFrame(function(step) {
        self.process(step);
    });
};

Audio.prototype.prevDelta = 0;
Audio.prototype.process = function(currentDelta, force) {
    this.requestAnimationFrame();

    if(!force && !this.gui.playing && this.tag.src.indexOf(SILENCE_URL) == -1){
        return;
    }

    if(document.hidden || (this.gui.pauseOnUnfocus && !document.hasFocus())){
        return;
    }

    var delta = currentDelta - this.prevDelta;
    if (delta < 1000 / this.targetFPS){
        return;
    }
    this.prevDelta = currentDelta;

    if(localStorage.getItem('last_type') === 'video'){
        localStorage.setItem('last_position', this.tag.currentTime);
    }

    this.ctx.clearRect(0, 0, this.height*2, this.height*2);

    this.ctx.save();
    this.ctx.translate(this.height, this.height);

    var left = this.getFrequencyData('left');
    this.assignBarValues(left, 0, 1, 'left', this.bars.leftInner);
    this.assignBarValues(left, 216, 1, 'left', this.bars.leftOuter);

    var right = this.getFrequencyData('right');
    this.assignBarValues(right, 0, 1, 'right', this.bars.rightInner);
    this.assignBarValues(right, 216, 1, 'right', this.bars.rightOuter);

    this.ctx.restore();

    if(this.prevTime !== Math.floor(this.tag.currentTime) || $('body').hasClass('hidden-gui')){
        this.gui.setCurrentTime(this.tag.currentTime, this.tag.duration);

        if(parseInt(this.tag.currentTime) % 5 === 0 && localStorage.getItem('last_type') === 'stream'){
            this.gui.setBackgroundImage('screens/' + localStorage.getItem('last_yt_id') + '.jpg')
        }

        this.gui.$apply();
        this.prevTime = Math.floor(this.tag.currentTime);
    }
};

Audio.prototype.drawBar = function(bar, color) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rotate((bar.a + 90) * Math.PI / 180);
    this.ctx.translate(bar.d, 0);
    this.ctx.rect(0, 0, bar.s*bar.r, bar.w*this.height/300);
    this.ctx.fillStyle = bar.ring == 'outer' ? 'rgb('+Math.round(255 - color)+', '+Math.round(125 + color*4)+', 0)' : 'rgb('+Math.round(255 - color*2)+', 0, '+Math.round(color*6)+')';
    this.ctx.fill();
    this.ctx.restore();
};
