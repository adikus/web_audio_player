var express = require('express');
var app = express();
var exec = require('child_process').exec;
var url = require("url");
var request = require("request");
var _ = require('lodash');
var ffmpeg = require('fluent-ffmpeg');

app.use(express.static('public'));

var ytInfos = {};

function thumbnailImage(url, cb) {
    if(url.indexOf('maxres') > -1)return cb(url);
    var newurl = url.replace('/default', '/maxresdefault');
    newurl = newurl.replace('/hqdefault', '/maxresdefault');
    request(newurl, function(error, response){
        if(response.statusCode != 200){
            newurl = url.replace('/default', '/hqdefault');
            cb(newurl);
        }else{
            cb(newurl);
        }
    });
}

function isExpired(id) {
    if(!ytInfos[id])return true;
    return ytInfos[id].expiresAt.getTime() < (new Date()).getTime();
}

function retrieveTrackInfo(id, reload, cb) {
    if(!isExpired(id) && !reload){
        console.log('Using extracted info from YT for:', id, 'expires at', ytInfos[id].expiresAt);
        return cb(ytInfos[id]);
    }
    if(reload){
        console.log('Re-Extracting from YT for:', id);
    }else{
        console.log('Extracting from YT for:', id);
    }

    exec('lib/youtube-dl -j -- ' + id, {maxBuffer: 1024 * 1024}, function (error, stdout, stderr){
        if(stdout.length > 2){
            var info = JSON.parse(stdout);
            var filteredInfo = _(info).pick(['fulltitle', 'id', 'title', 'duration', 'description', 'uploader', 'thumbnail']).value();
            thumbnailImage(filteredInfo.thumbnail, function(thumbnailUrl) {
                filteredInfo.thumbnail = thumbnailUrl;
                ytInfos[filteredInfo.id] = filteredInfo;

                var format = _(info.formats).find({format_id: '171'}) || _(info.formats).find({format_id: '140'}) || _(info.formats).find({format_id: '93'})
                filteredInfo.type = format.format_id === '93' ? 'stream' : 'video';
                filteredInfo.url = format.url;

                var expiresTimestamp = url.parse(filteredInfo.url, true).query.expire;
                if(!expiresTimestamp){
                    var urlParts = filteredInfo.url.split('/');
                    expiresTimestamp = urlParts[urlParts.indexOf('expire') + 1];
                }
                filteredInfo.expiresAt = new Date(expiresTimestamp*1000);
                cb(ytInfos[id]);
            });
        }else{
            ytInfos[id] = {error: stderr};
            cb(ytInfos[id]);
        }
    });
}

function pipeYTStream(url, req, res) {
    console.log('Pipe YT stream', req.params.id);

    var command = ffmpeg(url).noVideo().format('mp3');
    var stream = command.pipe();
    stream.pipe(res);
    command.on('error', function() {
        console.log('ffmpeg has been killed');
    });

    var imageCommand =
        ffmpeg(url)
            .format('image2')
            .outputOptions(['-vf fps=fps=1/10', '-updatefirst 1', '-y'])
            .output('public/screens/' + req.params.id + '.jpg');
    imageCommand.on('error', function(error) {
        console.log('screens ffmpeg has been killed');
    });
    imageCommand.run();

    res.on('close', function() { stream.end(); command.kill(); imageCommand.kill(); })
}

app.get('/yt/:id/info', function(req, res) {
    retrieveTrackInfo(req.params.id, req.query.reload, function(trackInfo) {
        res.json(trackInfo)
    });
});

app.get('/yt/api_key', function(req, res) {
    res.send(process.env.YT_API_KEY)
});

app.get('/yt-playlist/:id/info', function(req, res) {
    console.log('Extracting from YT for playlist:', req.params.id);

    var additionalParams = '';
    if(process.env.USER == 'andrej'){
        additionalParams = '-n';
    }
    exec('lib/youtube-dl ' + additionalParams + ' -j --flat-playlist -- ' + req.params.id, {maxBuffer: 1024 * 1024}, function (error, stdout){
        var info = JSON.parse('[' + stdout.slice(0, -1).split('\n').join(',') + ']');
        res.json(info);
    });
});

function pipeYTVideo(url, req, res) {
    console.log('Pipe YT video', req.params.id, req.headers.range);
    request.get({url: url.replace(/(\r\n|\n|\r)/gm,""), headers: {range: req.headers.range}}).pipe(res);
}

app.get('/yt/:id', function (req, res) {
    retrieveTrackInfo(req.params.id, req.query.reload, function(trackInfo) {
        if(trackInfo.error){
            res.status(404).send('Not found');
        }else if(trackInfo.type == 'video'){
            pipeYTVideo(trackInfo.url, req, res);
        }else {
            pipeYTStream(trackInfo.url, req, res);
        }
    });
});

var options = {
    url: 'https://api.github.com/repos/rg3/youtube-dl/tags',
    json: true,
    headers: {
        'User-Agent': 'web_audio_player'
    }
};

request.get(options, function (e, r, tags) {
    var name = tags[0].name;
    console.log('Downloading youtube-dl version', name)
    exec('curl -L https://github.com/rg3/youtube-dl/releases/download/'+name+'/youtube-dl -o lib/youtube-dl', function (error, stdout, stderror){
        if(!error){
            console.log('youtube-dl binary successfully downloaded.');
            exec('chmod a+rx lib/youtube-dl', function (error, stdout, stderror){
                if(!error){
                    console.log('Permissions on youtube-dl binary successfully set.');
                    app.listen((process.env.PORT || 3001), function () {
                        console.log('Example app listening on port 3001!');
                    });
                } else {
                    console.log(stdout, stderror)
                }
            });
        } else {
            console.log(stdout, stderror)
        }
    });
});
