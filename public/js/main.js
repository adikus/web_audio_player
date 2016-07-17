var app = angular.module('audioVisual', ['angular-sortable-view']);

app.controller('frequencyBars', function($scope) {
    window.frequencyBarsScope = $scope;

    $scope.playing = false;
    $scope.seekTo = null;
    $scope.loading = false;
    $scope.controls = {containerStyle: '', buttonGroupStyle: ''};

    $scope.playPause = function() { audio.playPause() };

    $scope.formatTime = function(n) {
        return ('0' + n).slice(-2);
    };

    $scope.setDuration = function (duration) {
        $scope.totalMinutes = $scope.formatTime(Math.floor(duration / 60));
        $scope.totalSeconds = $scope.formatTime(Math.floor(duration % 60));
    };

    $scope.setCurrentTime = function (currentTime, slider) {
        if($scope.sliding && !slider)return;
        $scope.currentMinutes = $scope.formatTime(Math.floor(currentTime / 60));
        $scope.currentSeconds = $scope.formatTime(Math.floor(currentTime % 60));

        if(!slider) {
            $scope.slider.slider('setValue', audio.tag.currentTime / audio.tag.duration * 1000);
        }
    };

    $scope.playTrack = function(track) {
        track.onReady(function() {
            audio.loadBuffer(track.url, function() {
                audio.play();
            });
        });
        $scope.currentTrack = track;
        $scope.storePlaylist();
        audio.stop();
    };

    $scope.loadFromURL = function(url) {
        var track = new Track({url: url}, $scope);
        $scope.playTrack(track);
    };

    $scope.addToPlaylistFromURL = function(url) {
        var track = new Track({url: url}, $scope);
        $scope.playlist.push(track);
        $scope.storePlaylist();
    };

    $scope.loadFromYT = function(link) {
        var track = new Track({youtube: {link: link}}, $scope);
        $scope.playTrack(track);
    };

    $scope.addToPlaylistFromYT = function(link) {
        var track = new Track({youtube: {link: link}}, $scope);
        $scope.playlist.push(track);
        $scope.storePlaylist();
    };

    $scope.removeFromPlaylist = function(track, $event) {
        var index = _($scope.playlist).indexOf(track);
        $scope.playlist.splice(index, 1);
        $scope.storePlaylist();

        $event.stopPropagation();
    };

    $scope.playingFromPlaylist = function() {
        return _($scope.playlist).indexOf($scope.currentTrack) > -1;
    };

    $scope.playNext = function() {
        var index = _($scope.playlist).indexOf($scope.currentTrack);
        if(index + 1 >= $scope.playlist.length)return false;

        $scope.playTrack($scope.playlist[index + 1]);
        return true;
    };

    $scope.playPrevious = function() {
        var index = _($scope.playlist).indexOf($scope.currentTrack);
        if(index <= 0)return false;

        $scope.playTrack($scope.playlist[index - 1]);
        return true;
    };

    $scope.storePlaylist = function() {
        localStorage.setItem('playlist', JSON.stringify(_($scope.playlist).map(function(track) {
            var json = track.toJSON();
            json.active = track == $scope.currentTrack;
            return json;
        })));
    };

    $scope.restorePlaylist = function() {
        var string = localStorage.getItem('playlist');
        if(string.length > 2){
            _(JSON.parse(string)).each(function(options) {
                var track = new Track(options, $scope);
                if(options.active){
                    $scope.currentTrack = track;
                }
                $scope.playlist.push(track);
            });
        }
    };

    $scope.playlist = [];

    $(function(){
        window.audio = new Audio($('audio'), $('canvas'), $scope);
        audio.loadBuffer(localStorage.getItem('last_played') || 'audio/panzer_vor.mp3', function() {
            audio.tag.currentTime = localStorage.getItem('last_position') || 0;
            frequencyBarsScope.stoppedAt = localStorage.getItem('last_position') || 0;
        });

        $scope.controls.buttonGroupStyle = {
            'margin-top': audio.height/2 - 20
        };

        $scope.restorePlaylist();

        $scope.slider = $('#current_time_slider');
        $scope.slider.width(audio.height/3);
        $scope.slider.slider({
            value: 0,
            tooltip: 'hide'
        }).on('slideStart', function() {
            $scope.sliding = true;
        }).on('slideStop', function(e) {
            $scope.sliding = false;
            audio.seek(audio.tag.duration*e.value/1000)
            $scope.setCurrentTime(audio.tag.duration*e.value/1000, true);
            $scope.$apply();
        }).on('slide', function(e) {
            $scope.setCurrentTime(audio.tag.duration*e.value/1000, true);
            $scope.$apply();
        });

    });
});
