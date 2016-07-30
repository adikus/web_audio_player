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
    this.url = yt.url;

    if(yt.id){
        this.id = yt.id;
    }else{
        this.id = yt.link.match(this.yt_regex)[1];
    }
    if(this.id && (!this.title || !this.uploader || !this.url)){
        console.log('Loading info for', this);
        this.loading = true;
        this.url = 'yt/'+this.id;

        var self = this;
        $.get('yt/'+this.id+'/info').success(function(data) {
            if(data.error){
                self.title = 'Unable to retrieve track';
                self.error = true;
            }else{
                self.title = data.title;
                self.uploader = data.uploader;
                self.info = data;
            }
            self.loading= false;
            self.ready = true;
            if(self.ready_callback)self.ready_callback();
            self.ngScope.$apply();
        });
    } else {
        this.ready = true;
    }
};

Track.prototype.reload = function() {
    if(this.type == 'yt') {
        this.loading = true;
        this.ngScope.$apply();

        var self = this;
        $.get('yt/'+this.id+'/info?reload=true').success(function() {
            self.loading= false;
            audio.reloaded = true;
            audio.loadBuffer(self.url);
        });
    }
};

Track.prototype.setupForURL = function(url) {
    this.type = 'url';
    this.url = url;
    this.title = url;
    this.ready = true;
};

Track.prototype.onReady = function(cb) {
    if(this.ready)cb();
    this.ready_callback = cb;
};

Track.prototype.toJSON = function() {
    if(this.type == 'url'){
        return {url: this.url};
    }else if(this.type == 'yt'){
        return {youtube: {id: this.id, title: this.title, uploader: this.uploader, url: this.url}};
    }
};
