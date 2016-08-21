Track = function(options, $scope) {
    this.ngScope = $scope;
    if (options.youtube){
        this.setupForYoutube(options.youtube);
    }else if (options.url) {
        this.setupForURL(options.url);
    }
};

Track.prototype.yt_regex = /(?:https?:\/\/)?(?:www\.)?youtu(?:be\.com\/watch\?(?:.*?&(?:amp;)?)?v=|\.be\/)([\w\-]+)(?:&(?:amp;)?[\w\?=]*)?/;
Track.prototype.setupForYoutube = function(yt) {
    this.type = 'yt';

    this.title = yt.title;
    this.uploader = yt.uploader;
    this.description = yt.description;

    if(yt.id){
        this.id = yt.id;
    }else{
        this.id = yt.link.match(this.yt_regex)[1];
    }
    this.url = 'yt/'+this.id;

    if(this.id && !this.title){
        this.loadYTInfo();
    }
};

Track.prototype.loadYTInfo = function(cb) {
    console.log('Loading info for', this.title || this.id);
    this.loading = true;

    var self = this;
    $.get('yt/'+this.id+'/info').success(function(data) {
        if(data.error){
            self.title = 'Unable to retrieve track';
            self.error = true;
        }else{
            self.title = data.title;
            self.uploader = data.uploader;
            self.description = data.description.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2');
            self.info = data;
        }
        self.loading= false;
        if(cb)cb();
        self.ngScope.$apply();
    });
};

Track.prototype.reload = function(cb) {
    if(this.type == 'yt') {
        this.loadYTInfo(cb);
    } else {
        cb();
    }
};

Track.prototype.setupForURL = function(url) {
    this.type = 'url';
    this.url = url;
    this.title = url;
    this.ready = true;
};

Track.prototype.onReady = function(cb) {
    this.reload(cb);
};

Track.prototype.toJSON = function() {
    if(this.type == 'url'){
        return {url: this.url};
    }else if(this.type == 'yt'){
        return {youtube: {id: this.id, title: this.title, uploader: this.uploader, url: this.url, description: this.description}};
    }
};
