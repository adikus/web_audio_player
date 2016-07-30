Audio = function($audio, $canvas, $scope) {
    this.setupCanvas($canvas);
    this.setupAudio($audio);

    this.gui = $scope;

    this.requestAnimationFrame();
};

Audio.prototype.setupCanvas = function($canvas) {
    this.height = Math.min(window.innerHeight, window.innerWidth - 400);
    $canvas.width(this.height);
    $canvas.height(this.height);
    $canvas.attr('width', this.height*2);
    $canvas.attr('height', this.height*2);

    this.canvas = $canvas[0];
    this.ctx = this.canvas.getContext("2d");

    this.bars.leftInner = this.addBars(215, -1, 'left', 'inner');
    this.bars.rightInner = this.addBars(215, -1, 'right', 'inner');
    this.bars.leftOuter = this.addBars(325, 1, 'left', 'outer');
    this.bars.rightOuter = this.addBars(325, 1, 'right', 'outer');
};

Audio.prototype.analysers = {};
Audio.prototype.setupAudio = function($audio) {
    this.tag = $audio[0];

    var self = this;
    this.tag.addEventListener("error", function(e) {
        if(e.currentTarget.error.code == 4 && !self.reloaded){
            self.gui.currentTrack.reload(true);
        }
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
        self.gui.setCurrentTime(0);
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
        self.reloaded = false;
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

Audio.prototype.history = {left: {}, right: {}};
Audio.prototype.assignBarValues = function(array, start, scale, side, bars) {
    var self = this;
    var barValues = this.getScaledValues(array, start, scale, side, bars.length, function(v) { return v; });
    var colorValues = this.getScaledValues(array, start, scale, side, bars.length, function(v, i) {
        self.saveHistory(side, start + i, v);
        return Math.abs(v - _(self.history[side][start + i]).mean());
    });

    var average = _(barValues).mean();
    var averageColor = _(colorValues).mean();

    _(bars).each(function(bar, i){
        bar.r = 1 + Math.max(0, barValues[i] - average/1.1)/5.0;
        bar.w = 0.25 + average/100;
        self.drawBar(bar, colorValues[i] - averageColor/1.1);
    });
};

Audio.prototype.getScaledValues = function(array, start, scale, side, length, cb) {
    if(scale == 1){
        return array.slice(start, start + length * scale).map(function(v, i) { return cb(v, i) });
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

Audio.prototype.saveHistory = function(side, i, value) {
    if(!this.history[side][i])this.history[side][i] = [];
    this.history[side][i].push(value);
    if(this.history[side][i].length > this.targetFPS/2)this.history[side][i].shift();
};

Audio.prototype.requestAnimationFrame = function() {
    var self = this;
    window.requestAnimationFrame(function(step) {
        self.process(step);
    });
};

Audio.prototype.targetFPS = 40;
Audio.prototype.prevDelta = 0;
Audio.prototype.process = function(currentDelta, force) {
    this.requestAnimationFrame();

    if(!force && !this.gui.playing){
        return;
    }

    if(document.hidden || (this.gui.stopOnLoseFocus && !document.hasFocus())){
        return;
    }

    var delta = currentDelta - this.prevDelta;
    if (delta < 1000 / this.targetFPS){
        return;
    }
    this.prevDelta = currentDelta;

    localStorage.setItem('last_position', this.tag.currentTime);

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

    if(this.prevTime != Math.floor(this.tag.currentTime)){
        this.gui.setCurrentTime(this.tag.currentTime);
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
