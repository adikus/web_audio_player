<template>
    <audio></audio>
</template>

<script>
    export default {
        props: ['audio', 'play', 'position', 'filename'],
        mounted () {
            this.audio.setup(this.$el);

            this.audio.tag.onended = () => this.$emit('playback:end');
            this.audio.tag.oncanplay = () => this.$emit('loading:ready', this.audio.tag.src);
            this.audio.tag.ontimeupdate = () => this.$emit('position:update', this.audio.tag.currentTime);
        },
        watch: {
            filename (newFilename) {
                if(newFilename){
                    this.audio.tag.src = newFilename;
                }
            },
            position (newPosition) {
                newPosition = parseFloat(newPosition) || 0;
                if(Math.abs(newPosition - this.audio.tag.currentTime > 0.01))
                    this.audio.tag.currentTime = parseFloat(newPosition) || 0;
            },
            play (shouldPlay) {
                if(shouldPlay){
                    this.audio.tag.play();
                }else{
                    this.audio.tag.pause();
                }
            }
        }
    };
</script>
