'use strict';
/*
 * this was pretty janky to begin with so any fixes should be applied to the main landing
 * page's script
 * but as of now the idea is this entire app will end up being just sort of a convenience
 * for chrome users -- only served when fingerprinting confirms they can handle it
 * loosely analogous to open.spotify.com - this is for studio.hallway99.com
 * non-chrome users will necessarily be prompted to download the native app instead of proceed
 * should see what spotify does, probably best to encourage everyone to go native
 */
~function() {
  S('#copyright').innerHTML = '&copy; ' + new Date().getFullYear() + ' Hallway99 ';

  // signup, login stuff -- magic ajax-form component?

  // password stuff (would go in component prototype)
  SS('aj-input[type=password]').forEach(pass => {
    pass.on('click', e => {
      let viz_btn = e.target.closest('.viz-toggle');
      if(viz_btn) {
        let viz = pass.classList.toggle('visible');
        let icon = viz ? 'visibility' : 'visibility_off';
        viz_btn.setAttribute('icon', icon);
      }
    })
  });

  // form business - quick n' dirty - also slops - not reusable - login and signup only
  SS('aj-form').forEach(form => {
    let action = form.getAttribute('action');
    let json = SS('[name]', form).reduce((a, input) => {
      let key = input.getAttribute('name');
      input.on('input', e => json[key] = e.target.textContent);
      return {...a, [key]: ''};
    }, {});
    let submit = e => {
      // todo only ship if valid, else animate problem and return
      submit_btn.classList.add('loading');
      fetch(action, {
        method: 'post',
        headers: new Headers({'content-type': 'application/json'}),
        body: JSON.stringify(json)
      }).then(r => r.json())
        .then(res => {
          if(res.success) return location.reload();
          // todo handle failure
        })
        .catch(console.error)
        .finally(ø => submit_btn.classList.remove('loading'))
    };
    let submit_btn = S('aj-submit', form).on('click', submit);
    form.on('focusin', e => document.onkeypress = e => {
      if(e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    }).on('focusout', e => document.onkeypress = null);
  });

  // modal here for now
  S('#login-btn').on('click', toggle_modal);
  S('.modal-close').on('click', toggle_modal);

  function toggle_modal(e) {
    let modal = S('.modal');
    let open = modal.classList.toggle('open');
    let evnt = open ? 'open' : 'close';
    modal.trigger(evnt);
  }
}();