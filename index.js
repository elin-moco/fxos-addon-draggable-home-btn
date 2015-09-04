/* global ScreenLayout, Event */

(function($$) {
  //var MANIFEST_URL = 'app://fa188ee8-9285-564d-99b0-5314c9ecf40e/manifest.webapp';
  var MANIFEST_URL = 'https://elin-moco.github.io/fxos-addon-draggable-home-btn/manifest.webapp';
  var TAP_THRESHOLD = 18;
  var LONG_TAP_THRESHOLD = 36;
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
    if (_lock && !_lock.closed) {
      return _lock;
    }
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
    containerEl.setAttribute('style', 'right: ' + ((window.screen.width - 48) / 2) + ' px;');

    var dragStartX, dragStartY, dragMoveX, dragMoveY, dragDeltaX, dragDeltaY,
      btnBottom, btnRight, touchTime, movement, dragging = false, holdTimer,
      deltaQueueX = [], deltaQueueY = [], finalDirectionX, finalDirectionY;
    containerEl.addEventListener('touchstart', function(evt) {
      try {
        deltaQueueX = [];
        deltaQueueY = [];
        dragging = true;
        movement = dragMoveX = dragMoveY = finalDirectionX = finalDirectionY = 0;
        touchTime = new Date().getTime();
        var touches = evt.changedTouches;
        dragStartX = touches[0].pageX;
        dragStartY = touches[0].pageY;
        btnRight = parseInt(containerEl.style.right);
        btnBottom = parseInt(containerEl.style.bottom);
        holdTimer = setTimeout(function() {
          if (dragging && movement < LONG_TAP_THRESHOLD) {
            window.navigator.vibrate(50);
            window.dispatchEvent(new CustomEvent('holdhome'));
          }
        }, 500);
        evt.preventDefault();
      } catch(e) {
        console.error(e);
      }
    });
    containerEl.addEventListener('touchmove', function(evt) {
      try {
        var touches = evt.changedTouches;
        dragDeltaX = touches[0].pageX - dragStartX - dragMoveX;
        if (dragDeltaX != 0) {
          finalDirectionX = dragDeltaX / Math.abs(dragDeltaX);
        }
        dragDeltaY = touches[0].pageY - dragStartY - dragMoveY;
        if (dragDeltaY != 0) {
          finalDirectionY = dragDeltaY / Math.abs(dragDeltaY);
        }
        dragMoveX = touches[0].pageX - dragStartX;
        dragMoveY = touches[0].pageY - dragStartY;
        var absX = Math.abs(dragDeltaX);
        var absY = Math.abs(dragDeltaY);
        if (deltaQueueX.length > 5) {
          deltaQueueX.shift();
        }
        deltaQueueX.push(absX);
        if (deltaQueueY.length > 5) {
          deltaQueueY.shift();
        }
        deltaQueueY.push(absY);
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
      } catch(e) {
        console.error(e);
      }
    });
    containerEl.addEventListener('touchend', function(evt) {
      try {
        var vx = deltaQueueX.reduce(function(a, b) {
            return a + b;
          }) / deltaQueueX.length * finalDirectionX * -1;
        var vy = deltaQueueY.reduce(function(a, b) {
            return a + b;
          }) / deltaQueueY.length * finalDirectionY * -1;
        var divide = Math.abs(vx) + Math.abs(vy);
        var dx = vx / divide;
        var dy = vy / divide;
        function slide() {
          var x = parseInt(containerEl.style.right);
          var y = parseInt(containerEl.style.bottom);
          var nx = x + vx;
          var ny = y + vy;
          containerEl.style.right = nx + 'px';
          if (nx < -6 || nx > window.screen.width - 42) {
            vx *= -1;
            dx *= -1;
          }
          containerEl.style.bottom = y + vy + 'px';
          if (ny < -6 || ny > window.screen.height - 42) {
            vy *= -1;
            dy *= -1;
          }
          vx -= dx;
          vy -= dy;
          if (Math.abs(vx) > Math.abs(dx) || Math.abs(vy) > Math.abs(dy)) {
            window.requestAnimationFrame(slide);
          }
        }

        window.requestAnimationFrame(slide);
        evt.stopImmediatePropagation();
        if (movement < TAP_THRESHOLD && (new Date().getTime() - touchTime) < 300) {
          window.navigator.vibrate(50);
          window.dispatchEvent(new CustomEvent('home'));
        }
        dragging = false;
        clearTimeout(holdTimer);
      } catch(e) {
        console.error(e);
      }
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
    if (app.manifestURL === MANIFEST_URL && !app.enabled) {
      uninitialize();
    }
  };
}(document.getElementById.bind(document)));
