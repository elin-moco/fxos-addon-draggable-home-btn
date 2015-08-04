/* global ScreenLayout, Event */

(function ($$) {
  var MANIFEST_URL = '/fxos-addon-draggable-home-btn/manifest.webapp';
  var TAP_THRESHOLD = 10;
  var LONG_TAP_THRESHOLD = 20;
  var _lock;

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

  function sl_getSettingsLock() {
    if (_lock && !_lock.closed) { return _lock; }
    var settings = window.navigator.mozSettings;
    return (_lock = settings.createLock());
  }

  function onScreenLocked() {
    var existingContainerEl = $$('draggable-home');
    existingContainerEl.style.visibility = 'hidden';
  }

  function onScreenUnlocked() {
    var existingContainerEl = $$('draggable-home');
    existingContainerEl.style.visibility = 'visible';
  }

  function initialize() {

    sl_getSettingsLock().set({'software-button.enabled': false});
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
    containerEl.setAttribute('style', 'border: 3px solid #FFFFFF; border-radius: 15px; background-color: rgba(255,255,255,0.5); position: fixed; display: block; width: 30px; height: 30px; bottom: 10px; right: '+((window.screen.width-48)/2)+'px; margin: 6px; box-shadow: 1px 1px 3px #000000; z-index: 65537;');

    var dragStartX, dragStartY, dragMoveX, dragMoveY, btnBottom, btnRight, touchTime, movement, dragging = false, holdTimer;
    containerEl.addEventListener('touchstart', function(evt) {
      dragging = true;
      movement = 0;
      touchTime = new Date().getTime();
      var touches = evt.changedTouches;
      dragStartX = dragMoveX = touches[0].pageX;
      dragStartY = dragMoveY = touches[0].pageY;
      btnRight = parseInt(containerEl.style.right);
      btnBottom = parseInt(containerEl.style.bottom);
      holdTimer = setTimeout(function() {
        if (dragging && movement < LONG_TAP_THRESHOLD) {
          window.navigator.vibrate(50);
          window.dispatchEvent(new CustomEvent('holdhome'));
        }
      }, 500);
      evt.preventDefault();
    });
    containerEl.addEventListener('touchmove', function(evt) {
      var touches = evt.changedTouches;
      var dragDeltaX = touches[0].pageX - dragMoveX;
      var dragDetlaY = touches[0].pageY - dragMoveY;
      dragMoveX = touches[0].pageX - dragStartX;
      dragMoveY = touches[0].pageY - dragStartY;
      var absX = Math.abs(dragDeltaX);
      var absY = Math.abs(dragDetlaY);
      movement += absX + absY;
      if (movement > TAP_THRESHOLD) {
        if (absX > 0) {
          var newRight = btnRight - dragMoveX;
          if (newRight > -6 && newRight < window.screen.width - 42) {
            containerEl.style.right = newRight + 'px';
          }
        }

        if (absY > 0) {
          var newBottom = btnBottom - dragMoveY;
          if (newBottom > -6 && newBottom < window.screen.height - 42) {
            containerEl.style.bottom = newBottom + 'px';
          }
        }
      }
    });
    containerEl.addEventListener('touchend', function(evt) {
      evt.stopImmediatePropagation();
      if (movement < TAP_THRESHOLD && (new Date().getTime() - touchTime) < 300) {
        window.navigator.vibrate(50);
        window.dispatchEvent(new CustomEvent('home'));
      }
      dragging = false;
      clearTimeout(holdTimer);
    });
    // Inject the elements into the system app
    $$('screen').appendChild(containerEl);
    window.addEventListener('lockscreen-appclosed', onScreenUnlocked);
    window.addEventListener('lockscreen-appopened', onScreenLocked);
  }
  
  function uninitialize() {
    if (!window.matchMedia('(-moz-physical-home-button)').matches) {
      sl_getSettingsLock().set({'software-button.enabled': true});
    }
    var existingContainerEl = $$('draggable-home');
    existingContainerEl.parentNode.removeChild(existingContainerEl);
    window.removeEventListener('lockscreen-appclosed', onScreenUnlocked);
    window.removeEventListener('lockscreen-appopened', onScreenLocked);
  }

  navigator.mozApps.mgmt.onenabledstatechange = function(event) {
    var app = event.application;
    if (app.manifestURL.indexOf(MANIFEST_URL) > 0 && !app.enabled) {
      uninitialize();
    }
  };
}(document.getElementById.bind(document)));
