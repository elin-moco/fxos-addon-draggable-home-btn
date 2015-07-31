(function () {
  var MANIFEST_URL = '/fxos-addon-draggable-home-btn/manifest.webapp';

  // If injecting into an app that was already running at the time
  // the app was enabled, simply initialize it.
  if (document.documentElement) {
    initialize();
  }

  // Otherwise, we need to wait for the DOM to be ready before
  // starting initialization since add-ons are usually (always?)
  // injected *before* `document.documentElement` is defined.
  else {
    window.addEventListener('DOMContentLoaded', initialize);
  }

  function initialize() {

    // Just a small shortcut to repeat myself less
    var $$ = document.getElementById.bind(document);

    // Remove existing control, for when this addon is re-run.
    var existingContainerEl = $$('draggable-home');
    if (existingContainerEl) {
      existingContainerEl.parentNode.removeChild(existingContainerEl);
    }

    // Build the brightness control elements.
    var containerEl = document.createElement('div');
    containerEl.setAttribute('id', 'draggable-home');
    containerEl.setAttribute('class', 'visible');
    containerEl.setAttribute('data-time-inserted', Date.now());
    containerEl.setAttribute('data-z-index-level', 'software-buttons');
    containerEl.setAttribute('style', 'border: 3px solid #FFFFFF; border-radius: 15px; background-color: rgba(255,255,255,0.5); position: fixed; display: block; width: 30px; height: 30px; bottom: 10px; right: '+((window.screen.width-30)/2)+'px; box-shadow: 1px 1px 3px #000000; z-index: 65537;');

    var dragStartX, dragStartY, btnBottom, btnRight, touchTime, movement, dragging = false, holdTimer;
    containerEl.addEventListener('touchstart', function(evt) {
      dragging = true;
      movement = 0;
      touchTime = new Date().getTime();
      var touches = evt.changedTouches;
      dragStartX = touches[0].pageX;
      dragStartY = touches[0].pageY;
      btnRight = parseInt(containerEl.style.right);
      btnBottom = parseInt(containerEl.style.bottom);
      holdTimer = setTimeout(function() {
        if (dragging && movement < 20) {
          window.navigator.vibrate(50);
          window.dispatchEvent(new CustomEvent('holdhome'));
        }
      }, 500);
      evt.preventDefault();
    });
    containerEl.addEventListener('touchmove', function(evt) {
      var touches = evt.changedTouches;
      var dragMoveX = touches[0].pageX - dragStartX;
      var dragMoveY = touches[0].pageY - dragStartY;
      var absX = Math.abs(dragMoveX);
      var absY = Math.abs(dragMoveY);
      movement += absX + absY;
      if (absX > 0) {
        containerEl.style.right = btnRight - dragMoveX + 'px';
      }
      else {
        containerEl.style.right = btnRight + 'px';
      }
      if (absY > 0) {
        containerEl.style.bottom = btnBottom - dragMoveY + 'px';
      }
      else {
        containerEl.style.bottom = btnBottom + 'px';
      }
    });
    containerEl.addEventListener('touchend', function(evt) {
      evt.stopImmediatePropagation();
      if (movement < 10 && (new Date().getTime() - touchTime) < 300) {
        window.navigator.vibrate(50);
        window.dispatchEvent(new CustomEvent('home'));
      }
      dragging = false;
      clearTimeout(holdTimer);
    });
    // Inject the elements into the system app
    $$('screen').appendChild(containerEl);
  }
  
  function uninitialize() {
    var $$ = document.getElementById.bind(document);

    var existingContainerEl = $$('draggable-home');
    existingContainerEl.parentNode.removeChild(existingContainerEl);
  }

  navigator.mozApps.mgmt.onenabledstatechange = function(event) {
    var app = event.application;
    if (app.manifestURL.indexOf(MANIFEST_URL) > 0 && !app.enabled) {
      uninitialize();
    }
  };
}());
