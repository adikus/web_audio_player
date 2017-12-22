var express = require('express');
var app = express();
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var url = require("url");
var request = require("request");
var _ = require('lodash');
var PassThrough = require('stream').PassThrough;
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

                var format = _(info.formats).find({format_id: '171'}) || _(info.formats).find({format_id: '140'}) || _(info.formats).find({format_id: '95'}) || _(info.formats).find({format_id: '93'});
                filteredInfo.type = format.format_id === '95' || format.format_id === '93' ? 'stream' : 'video';
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

    var stream = new PassThrough();
    var command = ffmpeg(url)
        .output('public/screens/' + req.params.id + '.jpg')
        .format('image2')
        .videoFilter('fps=fps=1/5')
        .outputOptions(['-updatefirst 1', '-y'])
        .output(stream)
        .noVideo()
        .format('mp3');
    command.run();
    stream.pipe(res);
    command.on('error', function() {
        console.log('ffmpeg has been killed');
    });

    res.on('close', function() { stream.end(); command.kill(); })
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

var spotifyTrackLengths = {};
var runningSpotifyStreams = {};
var runningFfmpegProcesses = {};

function pipeSpotifyStream(req, res) {
    var duration = spotifyTrackLengths[req.params.id];
    var length = Math.round(duration / 1000.0 * 40 * 1024 / 1.03);

    var bytesMatch = req.headers.range.match(/bytes=(\d*)-(\d)?/);
    var seekTo = bytesMatch[1] / 40.0 / 1024 * 1000 * 1.027;
    console.log('Playing spotify track', req.params.id, 'from',  seekTo/1000, 's');

    var spotifyStream = spawn('python3', ['/home/andrej/python/spotifyripper/play_track.py', req.params.id, seekTo]);

    res.set({
        'Content-Type': 'audio/mp3',
        'Content-Length': length,
        'Content-Range': 'bytes ' + bytesMatch[1] + '-' + (length-1) + '/' + length,
        'Accept-Ranges': 'Bytes'
    });
    res.status(206);

    var ffmpegCommand = ffmpeg(url)
        .input(spotifyStream.stdout)
        .inputOptions(['-f', 's16le', '-ar', '44.1k', '-ac', '2'])
        .output(res)
        .outputOptions(['-b:a', '320k'])
        .format('mp3');
    ffmpegCommand.run();

    spotifyStream.on('error', function(err) {
        console.log('error', err);
    });
    spotifyStream.on('exit', function () {
        ffmpegCommand.kill();
    });
    ffmpegCommand.on('error', function(err) {
        if(err.toString().indexOf('SIGKILL') < 0) console.log('error ffmpeg', err);
    });
    res.on('close', function() { ffmpegCommand.kill(); spotifyStream.stdin.pause(); spotifyStream.kill('SIGKILL'); });
}

app.get('/spotify/:id', function (req, res) {
    if(!req.headers.range || !spotifyTrackLengths[req.params.id]){
        exec('python3 /home/andrej/python/spotifyripper/play_track.py ' + req.params.id + ' 0 --info', function (error, stdout, stderror){
            var durationMatch = stdout.match(/"duration":(\d*)/);
            var duration = parseInt(durationMatch[1])
            spotifyTrackLengths[req.params.id] = duration;
            var length = Math.round(duration / 1000.0 * 40 * 1024 / 1.03);

            if(!req.headers.range){
                res.set({
                    'Content-Type': 'audio/mp3',
                    'Content-Length': length,
                    'Accept-Ranges': 'Bytes'
                });
                res.status(200);
                res.write('\n');
                res.end();
            } else {
                pipeSpotifyStream(req, res);
            }
        });
        return;
    }

    pipeSpotifyStream(req, res);
});

function cleanUpSpotify(){
    _(runningSpotifyStreams).each(function(_key, stream) {
        stream.stdin.pause();
        stream.kill('SIGKILL');
    });
    _(runningFfmpegProcesses).each(function(_key, proc) {
        proc.kill('SIGKILL');
    });
}

process.on('SIGINT', () => { cleanUpSpotify(); process.exit(); });
process.on('SIGTERM', () => { cleanUpSpotify(); process.exit();  });

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
