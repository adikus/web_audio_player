import Vue from 'vue'
import Visualiser from './tmpl/Visualiser.vue'

let vm = new Vue({
    el: '#main-container',
    components: { visualiser: Visualiser }
});
