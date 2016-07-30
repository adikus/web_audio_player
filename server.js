var express = require('express');
var app = express();
var exec = require('child_process').exec;
var url = require("url");
var request = require("request");
var _ = require('lodash');

app.use(express.static('public'));

var ytInfos = {};

function retrieveTrackInfo(id, reload, cb) {
    if(ytInfos[id] && !reload){
        console.log('Using extracted info from YT for:', id);
        return cb(ytInfos[id]);
    }
    if(reload){
        console.log('Re-Extracting from YT for:', id);
    }else{
        console.log('Extracting from YT for:', id);
    }

    exec('lib/youtube-dl  -j -- ' + id , function (error, stdout, stderr){
        if(stdout.length > 2){
            var info = JSON.parse(stdout);
            var filteredInfo = _(info).pick(['fulltitle', 'id', 'title', 'duration', 'description', 'uploader', 'thumbnail']).value();
            ytInfos[filteredInfo.id] = filteredInfo;
            filteredInfo.url = (_(info.formats).find({format_id: '171'}) || _(info.formats).find({format_id: '140'})).url;
        }else{
            ytInfos[id] = {error: stderr};
        }
        cb(ytInfos[id]);
    });
}

app.get('/yt/:id/info', function(req, res) {
    retrieveTrackInfo(req.params.id, req.query.reload, function(trackInfo) {
        res.json(trackInfo)
    });
});

app.get('/yt-playlist/:id/info', function(req, res) {
    console.log('Extracting from YT for playlist:', req.params.id);
    exec('lib/youtube-dl  -j --flat-playlist -- ' + req.params.id, function (error, stdout){
        var info = JSON.parse('[' + stdout.slice(0, -1).split('\n').join(',') + ']');
        res.json(info);
    });
});

function pipeYTVideo(url, req, res) {
    console.log(req.headers.range);
    request.get({url: url.replace(/(\r\n|\n|\r)/gm,""), headers: {range: req.headers.range}}).pipe(res);
}

app.get('/yt/:id', function (req, res) {
    retrieveTrackInfo(req.params.id, req.query.reload, function(trackInfo) {
        if(trackInfo.error){
            res.status(404).send('Not found');
        }else{
            pipeYTVideo(trackInfo.url, req, res);
        }
    });
});

exec('curl -L https://yt-dl.org/downloads/latest/youtube-dl -o lib/youtube-dl', function (error, stdout, stderror){
    if(!error){
        exec('chmod a+rx lib/youtube-dl', function (error, stdout, stderror){
           if(!error){
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
