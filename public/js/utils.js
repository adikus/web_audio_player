// Helper circular queue-like data structure
// for calculating a sum of a real time time series window in O(1)

CQueue = function(size) {
    this._array = [];
    var i = 0;
    while(i < size) {
        this._array.push(0);
        i++;
    }
    this._index = 0;
    this.sum = 0;
    this.size = size;
};

CQueue.prototype.add = function(a) {
    this._index = (this._index + 1) % this.size;
    this.sum -= this._array[this._index];
    this._array[this._index] = a;
    this.sum += a;
};
