var express = require('express');
var app = express();
var exec = require('child_process').exec;
var url = require("url");
var request = require("request");

app.use(express.static('public'));

app.get('/yt/:id', function (req, res) {
    console.log('Extracting from YT for:', req.params.id);
    console.log(req.headers.range);
    exec('youtube-dl  -f 171 -g -- ' + req.params.id , function callback(error, stdout){
        console.log('Extracted url:', stdout);
        if(stdout.length){
            request.get({url: stdout.replace(/(\r\n|\n|\r)/gm,""), headers: {range: req.headers.range}}).pipe(res);
        }else{
            res.json({error: 'Empty response from YT.'});
        }
    });
});

app.listen(3001, function () {
    console.log('Example app listening on port 3001!');
});