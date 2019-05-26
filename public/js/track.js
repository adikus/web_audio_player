Track = function(options, $scope) {
    this.ngScope = $scope;
    if (options.youtube){
        this.setupForYoutube(options.youtube);
    }else if (options.url) {
        this.setupForURL(options.url);
    }if (options.api) {
        this.setupForAPI(options.api);
    }
};

Track.yt_regex = /(?:https?:\/\/)?(?:www\.)?youtu(?:be\.com\/watch\?(?:.*?&(?:amp;)?)?v=|\.be\/)([\w\-]+)(?:&(?:amp;)?[\w\?=]*)?/;
Track.prototype.setupForYoutube = function(yt) {
    this.type = 'yt';

    this.title = yt.title;
    this.uploader = yt.uploader;
    this.description = yt.description;

    if(yt.id){
        this.id = yt.id;
    }else{
        this.id = yt.link.match(Track.yt_regex)[1];
    }
    this.url = 'yt/'+this.id;

    if(this.id && !this.title){
        this.loadYTInfo();
    }
};

Track.prototype.setupForAPI = function(item) {
    this.type = 'api';

    this.id = item.id;
    this.title = item.title;
    this.uploader = item.metadata.channelTitle;
    this.description = '';
    this.playlist_id = item.playlistVideo.playlist_id;
    this.item = item;
    if(item.mp3Upload && item.mp3Upload.url){
        this.url = item.mp3Upload.url;
    } else if(item.originalUpload && item.originalUpload.url) {
        this.url = item.originalUpload.url;
    } else {
        this.url = 'yt/'+this.id;
    }
    var thumbnail = item.metadata && item.metadata.thumbnails && (item.metadata.thumbnails.maxres || item.metadata.thumbnails.standard || item.metadata.thumbnails.high);
    this.info = {thumbnail: thumbnail && thumbnail.url};

    this.ready = true;
    this.loading = false;
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
    if(this.type === 'yt' || this.url.slice(0, 3) === 'yt/') {
        this.loadYTInfo(cb);
    } else if(cb) {
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
    }else if(this.type == 'api'){
        return {api: this.item};
    }
};
