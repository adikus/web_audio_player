import Audio from './Audio.js'
import Visualiser from './Visualiser.js'

import Vue from 'vue'
import VisualiserComp from './Visualiser.vue'
import AudioComp from './Audio.vue'

window.audio = new Audio();
window.visualiser = new Visualiser();

window.vm = new Vue({
    el: '#main-container',
    data: {
        audio: window.audio,
        visualiser: window.visualiser,
        play: false,
        position: 0,
        filename: null,
        pauseOnUnfocus: false
    },
    components: {
        visualiser: VisualiserComp,
        'audio-comp': AudioComp
    },
    mounted () {
        this.filename = 'yt/-5yD4WYiQBs';
    },
    methods: {
        loadingReady () {
            console.log('Track loaded');
            //this.play = true;
        },
        playbackEnded () {
            this.play = false;
        }
    }
});
