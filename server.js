var express = require('express');
var app = express();
var exec = require('child_process').exec;
var url = require("url");
var request = require("request");

app.use(express.static('public'));

app.get('/yt/:id', function (req, res) {
    // aY-7Y86e99Q
    exec('youtube-dl ' + req.params.id + ' -f bestaudio -g', function callback(error, stdout){
        console.log(stdout);
        request.get(stdout.replace(/(\r\n|\n|\r)/gm,"")).pipe(res);
    });
});

app.listen(3001, function () {
    console.log('Example app listening on port 3001!');
});