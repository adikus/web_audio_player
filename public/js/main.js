var app = angular.module('audioVisual', ['angular-sortable-view']);

app.controller('frequencyBars', function($scope) {
    window.frequencyBarsScope = $scope;

    $scope.playing = false;
    $scope.seekTo = null;
    $scope.loading = false;
    $scope.controls = {containerStyle: '', buttonGroupStyle: ''};

    $scope.stopAfterCurrent = localStorage.getItem('stopAfterCurrent') == 'true';
    $scope.loopPlaylist = localStorage.getItem('loopPlaylist') == 'true';
    $scope.showBackground = localStorage.getItem('show_background') ? localStorage.getItem('show_background') == 'true' : true;
    $scope.pauseOnUnfocus = localStorage.getItem('pause_unfocus') ? localStorage.getItem('pause_unfocus') == 'true' : true;

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
        $scope.currentTrack = track;
        if(track.error){
            return $scope.playNext();
        }
        track.onReady(function() {
            audio.loadBuffer(track.url, function() {
                audio.play();
                $scope.preloadNext();
            });
            if(track.info){
                $scope.setBackgroundImage(track.info.thumbnail);
            }
            $scope.storePlaylist();
        });
        audio.stop();

        setTimeout(function(){ $scope.scrollToCurrentTrack(); }, 100);
    };

    $scope.preloadNext = function() {
        var track = $scope.getNext();
        if(track)track.reload();
    };

    $scope.setBackgroundImage = function(url) {
        if(url){
            localStorage.setItem('last_background', url);
            if(!$scope.showBackground)return;
            var img = new Image();
            img.onload = function () {
                $scope.backgroundCtx.clearRect(0, 0, audio.height, audio.height);
                $scope.backgroundCtx.globalAlpha = 0.5;
                $scope.backgroundCtx.save();
                $scope.backgroundCtx.beginPath();
                $scope.backgroundCtx.arc(audio.height/2, audio.height/2, audio.height/2/1.5, 0, 2*Math.PI);
                $scope.backgroundCtx.fillStyle = '#FF0000';
                $scope.backgroundCtx.fill();
                $scope.backgroundCtx.globalCompositeOperation = "source-in";

                var sx = img.width > img.height ? (img.width - img.height)/2 : 0;
                var sy = img.width > img.height ? 0 : (img.height - img.width)/2;
                var size = Math.min(img.width, img.height);
                var dx = audio.height/2/3;
                var dsize = audio.height - 2*dx;

                $scope.backgroundCtx.drawImage(img, sx, sy, size, size, dx, dx, dsize, dsize);
                $scope.backgroundCtx.restore();
            };
            img.src = url;
        } else {
            $scope.backgroundCtx.clearRect(0, 0, audio.height, audio.height);
        }
    };

    $scope.toggleBackground = function() {
        if($scope.showBackground){
            if(localStorage.getItem('last_background')){
                $scope.setBackgroundImage(localStorage.getItem('last_background'));
            }
        } else {
            $scope.setBackgroundImage(null);
        }
        localStorage.setItem('show_background', $scope.showBackground);
    };

    $scope.scrollToCurrentTrack = function() {
        var $listGroup = $('.playlist .list-group');
        var $activeItem = $('.playlist .list-group-item.active');
        if($activeItem.length == 0)return;
        $listGroup.animate({
            scrollTop: $activeItem.offset().top + $listGroup.scrollTop() - 75
        }, 500);
    };

    $scope.loadFromURL = function(url) {
        var track = new Track({url: url}, $scope);
        $scope.playTrack(track);
    };

    $scope.addToPlaylistFromURL = function(url) {
        var track = new Track({url: url}, $scope);
        $scope.playlist.push(track);
        localStorage.removeItem('last_playlist');
        $scope.storePlaylist();
    };

    $scope.loadFromYT = function(link) {
        var track = new Track({youtube: {link: link}}, $scope);
        $scope.playTrack(track);
    };

    $scope.addToPlaylistFromYT = function(link) {
        var track = new Track({youtube: {link: link}}, $scope);
        $scope.playlist.push(track);
        localStorage.removeItem('last_playlist');
        $scope.storePlaylist();
    };

    $scope.addYTPlaylist = function(link) {
        var playlistRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch(?:.+?)|playlist\?)list=([\-_A-Za-z\d]+)/;
        var playlistID = link.match(playlistRegex)[1];
        $.get('yt-playlist/'+playlistID+'/info').success(function(data) {
            _(data).each(function(trackInfo){
                var track = new Track({youtube: {id: trackInfo.id, title: trackInfo.title}}, $scope);
                $scope.playlist.push(track);
            });
            localStorage.removeItem('last_playlist');
            $scope.storePlaylist();
            $scope.$apply();
        });
    };

    $scope.removeFromPlaylist = function(track, $event) {
        var index = _($scope.playlist).indexOf(track);
        $scope.playlist.splice(index, 1);
        localStorage.removeItem('last_playlist');
        $scope.storePlaylist();

        $event.stopPropagation();
    };

    $scope.playingFromPlaylist = function() {
        return _($scope.playlist).indexOf($scope.currentTrack) > -1;
    };

    $scope.getNext = function() {
        var index = _($scope.playlist).indexOf($scope.currentTrack);
        if(index + 1 >= $scope.playlist.length){
            if($scope.loopPlaylist){
                index = -1;
            }else{
                return null;
            }
        }

        return $scope.playlist[index + 1];
    };

    $scope.playNext = function() {
        var track = $scope.getNext();
        $scope.playTrack(track);
        return !!track;
    };

    $scope.playPrevious = function() {
        var index = _($scope.playlist).indexOf($scope.currentTrack);
        if(index <= 0)return false;

        $scope.playTrack($scope.playlist[index - 1]);
        return true;
    };

    $scope.storePlaylist = function(name) {
        localStorage.setItem(name || localStorage.getItem('last_playlist') || 'playlist', JSON.stringify(_($scope.playlist).map(function(track) {
            var json = track.toJSON();
            json.active = track == $scope.currentTrack;
            return json;
        })));
    };

    $scope.restorePlaylist = function(name) {
        var string = localStorage.getItem(name || localStorage.getItem('last_playlist') || 'playlist');
        if(string && string.length > 2){
            _(JSON.parse(string)).each(function(options) {
                var track = new Track(options, $scope);
                if(options.active){
                    $scope.currentTrack = track;
                }
                $scope.playlist.push(track);
            });

            setTimeout(function(){ $scope.scrollToCurrentTrack(); }, 500);
        }
    };

    $scope.reversePlaylist = function () {
        $scope.playlist = $scope.playlist.reverse();
        $scope.storePlaylist();
    };

    $scope.clearPlaylist = function () {
        $scope.playlist = [];
        localStorage.removeItem('last_playlist');
        $scope.storePlaylist();
    };

    $scope.toggleStopAfterCurrent = function() {
        $scope.stopAfterCurrent = !$scope.stopAfterCurrent;
        localStorage.setItem('stopAfterCurrent', $scope.stopAfterCurrent);
    };

    $scope.toggleLoopPlaylist = function() {
        $scope.loopPlaylist = !$scope.loopPlaylist;
        localStorage.setItem('loopPlaylist', $scope.loopPlaylist);
    };

    $scope.savePlaylistModal = function() {
        $scope.playlistModalMode = 'save';
        $('#playlist_modal').modal('toggle');
    };

    $scope.loadPlaylistModal = function() {
        $scope.playlistModalMode = 'load';
        $scope.playlistNames = _(JSON.parse(localStorage.getItem('playlist_names'))).map(function(name) {
            return name.split('-').slice(1).join('-');
        }).value();
        $('#playlist_modal').modal('toggle');
    };

    $scope.savePlaylist = function(name) {
        if(!name || name.length == 0)return;
        var names = JSON.parse(localStorage.getItem('playlist_names') || '[]');
        names.push('playlist-'+name);
        localStorage.setItem('playlist_names', JSON.stringify(_(names).uniq()));
        $scope.storePlaylist(_(names).last());
        localStorage.setItem('last_playlist', _(names).last());
        $('#playlist_modal').modal('hide');
    };

    $scope.loadPlaylist = function(name) {
        $scope.playlist = [];
        $scope.restorePlaylist(name);
        localStorage.setItem('last_playlist', name);
        $scope.playTrack($scope.playlist[0]);
        $('#playlist_modal').modal('hide');
    };

    $scope.removePlaylist = function(name, $event) {
        localStorage.removeItem(name);
        var names = JSON.parse(localStorage.getItem('playlist_names') || '[]');
        names = _(names).reject(function(n) { return n == name; }).value();
        localStorage.setItem('playlist_names', JSON.stringify(_(names).uniq()));
        $scope.playlistNames = _(names).map(function(name) {
            return name.split('-').slice(1).join('-');
        }).value();

        $event.stopPropagation();
    };

    $scope.togglepauseOnUnfocus = function() {
        localStorage.setItem('pause_unfocus', $scope.pauseOnUnfocus);
    };

    $scope.playlist = [];

    $(function(){
        window.audio = new Audio($('audio'), $('#foreground'), $scope);
        if(localStorage.getItem('last_played')){
            audio.loadBuffer(localStorage.getItem('last_played'), function() {
                audio.tag.currentTime = localStorage.getItem('last_position') || 0;
                $scope.stoppedAt = localStorage.getItem('last_position') || 0;
            });
        }

        $('.container-fluid').height(window.innerHeight);

        $scope.$foreground = $('#foreground');
        $scope.$background = $('#background');
        $scope.$background.attr('width', $scope.$foreground.width());
        $scope.$background.attr('height', $scope.$foreground.height());
        $scope.$background.attr('style', 'margin-left:' + Math.round($scope.$foreground.offset().left - $scope.$foreground.position().left) + 'px')
        $scope.$background.width($scope.$foreground.width());
        $scope.$background.height($scope.$foreground.height());

        $scope.backgroundCtx = $scope.$background[0].getContext("2d");

        if(localStorage.getItem('last_background')){
            $scope.setBackgroundImage(localStorage.getItem('last_background'));
        }

        $scope.controls.buttonGroupStyle = {
            'margin-top': audio.height/2 - 20
        };

        $scope.restorePlaylist();
        $scope.$apply();

        $('.audio-visual-controls .playlist .list-group').attr('style', 'max-height: '+ (window.innerHeight - 100) +'px;');

        $('[data-toggle="tooltip"]').tooltip();

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
