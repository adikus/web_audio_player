<template>
    <div class="canvas-container">
        <canvas id="background"></canvas>
        <canvas id="foreground"></canvas>
    </div>
</template>

<script>
    export default {
        props: ['visualiser', 'audio', 'play', 'pauseOnUnfocus'],
        data () {
            return {
                prevDelta: 0
            }
        },
        mounted () {
            this.visualiser.setup(audio, this.$el.children[1], this.$el.children[0]);
            this.requestAnimationFrame();
        },
        methods: {
            requestAnimationFrame () {
                window.requestAnimationFrame( step => this.process(step) );
            },

            process (currentDelta, force) {
                this.requestAnimationFrame();

                if(!force && !this.play){
                    return;
                }

                if(document.hidden || (this.pauseOnUnfocus && !document.hasFocus())){
                    return;
                }

                let delta = currentDelta - this.prevDelta;
                if (delta < 1000 / this.visualiser.targetFPS){
                    return;
                }
                this.prevDelta = currentDelta;

                this.visualiser.draw();
            }
        }
    }
</script>

<style scoped>
canvas {
    position: absolute;
}
</style>
