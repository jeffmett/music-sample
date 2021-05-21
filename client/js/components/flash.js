'use strict';
/*
 * was supposed to be mobile first
 * but teacher app needs to be solid, so students'll have to wait
 *
 * - nothing should need to import, anything can use:
 * - document.trigger('flash', options)
 * primarily used for showing save statuses and responses,
 * - options should (initially) be:
 * {
 *   type: loading, saving, success, fail, info
 *   message,
 * }
 */
let timer;
Vue.component('flash', {
  mounted() {
    document.on('flash', ({detail: {type, message, time = 7500}}) => {
      clearTimeout(timer);
      this.state = type;
      this.current_message = message;
      if(type !== 'saving') timer = setTimeout(ø => this.state = 'idle', time)
    })
  },
  data() {
    return {
      state: 'idle', // saving, success, fail
      current_message: 'test message',
      queue: [] // todo handle multiple messages --
    }
  },
  methods: {},
  computed: {},
  template: `
    <div id="app-flash" :class="state">
      <div class="msg">{{current_message}}</div>
      <i icon="clear" class="nix" @click="state = 'idle'"></i> 
    </div> 
  `
})