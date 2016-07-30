var express = require('express');
var app = express();
var exec = require('child_process').exec;
var url = require("url");
var request = require("request");
var _ = require('lodash');

app.use(express.static('public'));

var ytInfos = {};

app.get('/yt/:id/info', function(req, res) {Re
    if(ytInfos[req.params.id] && !req.query.reload){
        console.log('Using extracted info from YT for:', req.params.id);
        return res.json(ytInfos[req.params.id]);
    }
    if(req.query.reload){
        console.log('Re-Extracting from YT for:', req.params.id);
    }else{
        console.log('Extracting from YT for:', req.params.id);
    }
    exec('youtube-dl  -j -- ' + req.params.id , function callback(error, stdout){
        var info = JSON.parse(stdout);
        var filteredInfo = _(info).pick(['fulltitle', 'id', 'title', 'duration', 'description', 'uploader', 'thumbnail']).value();
        ytInfos[filteredInfo.id] = filteredInfo;
        filteredInfo.url = (_(info.formats).find({format_id: '171'}) || _(info.formats).find({format_id: '140'})).url;
        res.json(filteredInfo);
    });
});

function pipeYTVideo(url, req, res) {
    console.log(req.headers.range);
    request.get({url: url.replace(/(\r\n|\n|\r)/gm,""), headers: {range: req.headers.range}}).pipe(res);
}

app.get('/yt/:id', function (req, res) {
    if(ytInfos[req.params.id]){
        console.log('Using extracted url from YT for:', req.params.id);
        return pipeYTVideo(ytInfos[req.params.id].url, req, res)
    }

    console.log('Extracting from YT for:', req.params.id);
    exec('youtube-dl  -f 171 -g -- ' + req.params.id , function callback(error, stdout){
        if(stdout.length){
            pipeYTVideo(stdout, req, res)
        }else{
            res.json({error: 'Empty response from YT.'});
        }
    });
});

app.listen(3001, function () {
    console.log('Example app listening on port 3001!');
});