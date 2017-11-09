import CQueue from './CQueue.js'

const TARGET_FPS = 80;
const DIFF_TIMINGS = [0.25, 0.5, 1, 2];

const INNER_BARS = 215;
const OUTER_BARS = 325;

let Visualiser = class Visualiser {
    constructor () {
        this.timings = {
            assignBarValues: new CQueue(120),
            process: new CQueue(120),
            barValues: new CQueue(120),
            colorValues: new CQueue(120),
            averages: new CQueue(120),
            drawBars: new CQueue(120)
        };

        this.history = {left: {}, right: {}};

        this.center = {x: 0, y: 0};
        this.arcSize = 1;
        this.arcStart = 0;
        this.scale = 1;

        this.state = 0;
    }

    debugTime (key, cb) {
        let start = new Date();
        cb.apply(this);
        let end = new Date();
        this.timings[key].add(end.getTime() - start.getTime());
    }

    resize () {
        this.height = $(window).innerHeight();
        this.width = $(window).innerWidth();

        this.$foreground.height(this.height);
        this.$foreground.width(this.width);
        this.$foreground.attr('height', this.height*2);
        this.$foreground.attr('width', this.width*2);

        this.$background.height(this.height);
        this.$background.width(this.width);

        this.radius = this.height / 1.5;
    }

    setupBars () {
        this.bars = {};
        this.bars.leftInner = this.addBars(INNER_BARS, -1, 'left', 'inner');
        this.bars.rightInner = this.addBars(INNER_BARS, -1, 'right', 'inner');
        this.bars.leftOuter = this.addBars(OUTER_BARS, 1, 'left', 'outer');
        this.bars.rightOuter = this.addBars(OUTER_BARS, 1, 'right', 'outer');

        // Setup bar history
        this.barHistory = {};
        ['left', 'right'].forEach(side => {
            this.barHistory[side] = {};
            for(let i = 0; i < INNER_BARS + OUTER_BARS + 1; i++){
                this.barHistory[side][i] = {};
                DIFF_TIMINGS.forEach(targetTime => {
                    this.barHistory[side][i][targetTime] = new CQueue(targetTime * this.targetFPS);
                })
            }
        });
    }

    addBars (n, s, side, ring) {
        return _.range(n).map((i) => {
            return Visualiser.makeBar(
                (side === 'left' ? 1 : -1) * (i + 0.5) / n * 180,
                s,
                ring === 'inner' ? 1 : 0.5,
                side,
                ring
            );
        });
    }

    static makeBar (angle, scale, width, side, ring) {
        return {
            r: 1,
            a: angle,
            s: scale,
            w: width,
            side: side,
            ring: ring
        };
    }

    setup (audio, $foreground, $background) {
        this.audio = audio;

        this.$foreground = $($foreground);
        this.$background = $($background);

        this.foregroundCtx = this.$foreground[0].getContext("2d");

        this.targetFPS = TARGET_FPS;

        this.resize();
        this.setupBars();
        this.draw();
    }

    assignBarValues (array, start, scale, side, bars) {
        let barValues = this.getScaledValues(array, start, scale, side, bars.length, function(v) { return v; });
        let colorValues = this.getScaledValues(array, start, scale, side, bars.length, (v, i) => {
            this.saveBarHistory(side, start + i, v, 2);
            let diffSum = 0;
            for(let j = 0; j < DIFF_TIMINGS.length; j++){
                let targetTime = DIFF_TIMINGS[j];
                let queue = this.barHistory[side][start + i][targetTime];
                diffSum += Math.max(0.1, v - queue.sum / queue.size)
            }
            return diffSum / DIFF_TIMINGS.length;
        });

        let average = _(barValues).mean();
        this.saveHistory(side, 'average-'+start, average, 2);
        let windowedAverage = _(this.history[side]['average-'+start]).mean();
        let maxColor = Math.max(_(colorValues).max(), 20);

        _(bars).each((bar, i) => {
            bar.r = 1 + Math.max(0, barValues[i] - (windowedAverage+average)/2.2)/5.0;
            bar.w = 0.25 + average/100;
            this.drawBar(bar, colorValues[i]/maxColor*40);
        });
    }

    getScaledValues (array, start, scale, side, length, cb) {
        if(scale === 1){
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
    }

    saveBarHistory (side, i, value) {
        for(let j = 0; j < DIFF_TIMINGS.length; j++){
            let targetTime = DIFF_TIMINGS[j];
            this.barHistory[side][i][targetTime].add(value);
        }
    }

    saveHistory (side, i, value, targetTime) {
        if(!this.history[side][i])this.history[side][i] = [];
        this.history[side][i].push(value);
        if(this.history[side][i].length > this.targetFPS*targetTime)this.history[side][i].shift();
    }

    draw () {
        this.foregroundCtx.clearRect(0, 0, this.width*2, this.height*2);

        this.foregroundCtx.save();
        this.foregroundCtx.translate(this.width - this.center.x, this.height - this.center.y);

        let left = this.audio.getFrequencyData('left');
        this.assignBarValues(left, 0, 1, 'left', this.bars.leftInner);
        this.assignBarValues(left, INNER_BARS, 1, 'left', this.bars.leftOuter);

        this.foregroundCtx.restore();
        this.foregroundCtx.save();
        this.foregroundCtx.translate(this.width + this.center.x, this.height - this.center.y);

        let right = this.audio.getFrequencyData('right');
        this.assignBarValues(right, 0, 1, 'right', this.bars.rightInner);
        this.assignBarValues(right, INNER_BARS, 1, 'right', this.bars.rightOuter);

        this.foregroundCtx.restore();
    }

    drawBar (bar, colorValue) {
        let color = bar.ring === 'outer' ?
            'rgb('+Math.round(255 - colorValue)+', '+Math.round(125 + colorValue*4)+', 0)' :
            'rgb('+Math.round(255 - colorValue*2)+', 0, '+Math.round(colorValue*6)+')';

        this.foregroundCtx.save();
        this.foregroundCtx.beginPath();
        let angle = this.scale > 0 ? bar.a : Math.sign(bar.a) * this.arcStart - bar.a;
        this.foregroundCtx.rotate((angle * this.arcSize + 90 + Math.sign(bar.a) * this.arcStart) * Math.PI / 180);
        this.foregroundCtx.translate(this.radius, 0);
        this.foregroundCtx.rect(0, 0, this.scale * bar.s * bar.r * this.height/100, bar.w * this.height/300);
        this.foregroundCtx.fillStyle = color;
        this.foregroundCtx.fill();
        this.foregroundCtx.restore();
    }

    moveTo(x, y, r, size, start, time) {
        let defaultRadius = this.height / 1.5;
        let smallRadius = this.radius;
        let bigRadius = r;
        let startMultiplier = this.radius / defaultRadius;
        let smallArcStart = this.arcStart;
        let targetArcStart = start;
        let smallCenterX = this.center.x;
        let smallCenterY = this.center.y;
        let targetCenterX = x;
        let targetCenterY = y;

        return $({t: 0}).animate({t: 1}, {
            duration: time,
            step: (t) => {
                this.radius = smallRadius + t * (bigRadius - smallRadius);
                this.center = {x: smallCenterX + (targetCenterX - smallCenterX) * t, y: smallCenterY + (targetCenterY - smallCenterY) * t};
                let currentMultiplier = startMultiplier + t * (1 / size - startMultiplier);
                this.arcSize = 1.0 / currentMultiplier;
                this.arcStart = smallArcStart + t * (targetArcStart - smallArcStart);
                //console.log(this.center.x, this.center.y, this.radius, this.arcSize, this.arcStart);
            }
        }).promise();
    }

    async move (state) {
        let defaultRadius = this.height / 1.5;
        let multiplier = 100;

        let times = { 0: 600, 1: 400, 2: 0, 3: 20, 4: 20, 5: 20, 6: 600 };

        let arcStart = 60 - 90.0/multiplier;

        let stateFunctions = {
            0: async (time) => {
                await this.moveTo(0, 0, defaultRadius, 1.0, 0, time);
            },
            1: async (time) => {
                let _mult = 5;
                await this.moveTo(((_mult - 1) * defaultRadius) * -0.8666, ((_mult - 1) * defaultRadius) * 0.5, defaultRadius * _mult, 1.0 / _mult, arcStart, time);
            },
            2: async (time) => {
                await this.moveTo(this.width/4 + ((multiplier - 1) * defaultRadius) * -0.8666, this.height/2 + ((multiplier - 1) * defaultRadius) * 0.5, defaultRadius * multiplier, 1.0 / multiplier, arcStart, time);
            },
            3: async (time) => {
                this.scale = -1;
                this.center.x = this.width/4 + ((multiplier + 1) * defaultRadius) * 0.8666;
                this.center.y = this.height/2 + ((multiplier + 1) * defaultRadius) * -0.5;
                this.arcStart = 240 - 90.0/multiplier;
            },
            4: async (time) => {
                for(let i = 99; i > 60; i -= 10){
                    await this.moveTo(this.width/4 + ((i + 1) * defaultRadius) * 0.8666, this.height/2 + ((i + 1) * defaultRadius) * -0.5, defaultRadius * i, 1.0 / i, 240 - 90.0/i, time);
                }
            },
            5: async (time) => {
                for(let i = 59; i > 20; i -= 5){
                    await this.moveTo(this.width/4 + ((i + 1) * defaultRadius) * 0.8666, this.height/2 + ((i + 1) * defaultRadius) * -0.5, defaultRadius * i, 1.0 / i, 240 - 90.0/i, time);
                }
            },
            6: async (time) => {
                for(let i = 19; i > 4; i -= 2){
                    await this.moveTo(this.width/3 + ((i + 1) * defaultRadius) * 0.8666, this.height/2 + ((i + 1) * defaultRadius) * -0.5, defaultRadius * i, 1.0 / i, 240 - 90.0/i, time);
                }
            },
            7: async (time) => {
                await this.moveTo(this.width, -this.height, this.height*1.5, 0.5, 180, time);
            }
        };

        stateFunctions[state](times[state > this.state ? state - 1 : state]);
    }
};

export default Visualiser;
