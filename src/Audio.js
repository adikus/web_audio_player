Audio = function() {};

Audio.prototype.setup = function($el) {
    this.analysers = {};

    this.tag = $el;

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
};

Audio.prototype.addAnalyzer = function(key, smoothing) {
    this.analysers[key] = this.context.createAnalyser();
    this.analysers[key].smoothingTimeConstant = smoothing;
};

Audio.prototype.getFrequencyData = function(key) {
    if(!this.analysers[key]) return;
    let array =  new Uint8Array(this.analysers[key].frequencyBinCount);
    this.analysers[key].getByteFrequencyData(array);
    return array;
};


export default Audio;
