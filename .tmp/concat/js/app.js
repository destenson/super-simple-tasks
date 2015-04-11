$(document).ready(function() {
  var $link_input, $new_task_input, KeyPress, addLinkTriggered, addTaskTriggered, initialize, nextTourBus, tour;
  console.log('Super Simple Tasks v2.0.1');
  console.log('Like looking under the hood? Feel free to help make Super Simple Tasks better at https://github.com/humphreybc/super-simple-tasks');
  $new_task_input = $('#new-task');
  $link_input = $('#add-link-input');
  window.tourRunning = false;
  tour = $('#tour').tourbus({
    onStop: Views.finishTour,
    onLegStart: function(leg, bus) {
      window.tourRunning = bus.running;
      return leg.$el.addClass('animated fadeInDown');
    }
  });
  if (!!window.chrome && chrome.storage) {
    console.log('Using chrome.storage.sync to save');
    window.storageType = ChromeStorage;
  } else {
    console.log('Using localStorage to save');
    window.storageType = LocalStorage;
  }
  initialize = function() {
    return window.storageType.get(DB.db_key, function(allTasks) {
      if (allTasks === null) {
        allTasks = Arrays.default_data;
        window.storageType.set(DB.db_key, allTasks);
      }
      Migrations.run(allTasks);
      Views.showTasks(allTasks);
      $new_task_input.focus();
      Views.checkOnboarding(allTasks, tour);
      return Views.checkWhatsNew();
    });
  };
  nextTourBus = function() {
    if (window.tourRunning) {
      return tour.trigger('next.tourbus');
    }
  };
  $('#whats-new-close').click(function(e) {
    $('.whats-new').hide();
    return Views.closeWhatsNew();
  });
  addTaskTriggered = function() {
    var link, name;
    nextTourBus();
    name = $new_task_input.val();
    link = $link_input.val();
    Task.setNewTask(name, link);
    $new_task_input.val('');
    $link_input.val('');
    return $new_task_input.focus();
  };
  addLinkTriggered = function() {
    if ($('#add-link').hasClass('link-active')) {
      $('#add-link').removeClass('link-active');
      $('#add-link-input-wrapper').css('opacity', '0');
      setTimeout((function() {
        return $('#task-list').css('margin-top', '-40px');
      }), 150);
      return $new_task_input.focus();
    } else {
      $('#add-link').addClass('link-active');
      $('#task-list').css('margin-top', '0px');
      setTimeout((function() {
        return $('#add-link-input-wrapper').css('opacity', '1');
      }), 150);
      return $link_input.focus();
    }
  };
  $('#task-submit').click(addTaskTriggered);
  $('#add-link').click(addLinkTriggered);
  KeyPress = function(e) {
    var evtobj;
    evtobj = window.event ? event : e;
    if (evtobj.keyCode === 13) {
      addTaskTriggered();
    }
    if (evtobj.ctrlKey && evtobj.keyCode === 76) {
      return addLinkTriggered();
    }
  };
  document.onkeydown = KeyPress;
  $(document).on('click', '.task > label', function(e) {
    return e.preventDefault();
  });
  $(document).on('mousedown', '.task > label', function() {
    var holding;
    holding = false;
    setTimeout((function() {
      return holding = true;
    }), 250);
    return $(this).one('mouseup', function() {
      var checkbox, li;
      checkbox = void 0;
      if (!holding) {
        checkbox = $('input', this);
        checkbox.prop('checked', !checkbox.prop('checked'));
        nextTourBus();
        li = $(this).closest('li');
        return li.slideToggle(function() {
          return Task.markDone(Views.getId(li));
        });
      }
    });
  });
  $('#undo').click(function(e) {
    return Task.undoLast();
  });
  $(document).on('click', '.priority', function(e) {
    var li, type_attr, value;
    e.preventDefault();
    nextTourBus();
    type_attr = $(e.currentTarget).attr('type');
    value = $(this).attr(type_attr);
    li = $(this).closest('li');
    return Task.changeAttr(li, type_attr, value);
  });
  $('#mark-all-done').click(function(e) {
    e.preventDefault();
    return window.storageType.get(DB.db_key, function(allTasks) {
      if (allTasks.length === 0) {
        return confirm('No tasks to mark done!');
      } else {
        if (confirm('Are you sure you want to mark all tasks as done?')) {
          return Task.markAllDone();
        }
      }
    });
  });
  $('#export-tasks').click(function(e) {
    e.preventDefault();
    return window.storageType.get(DB.db_key, function(allTasks) {
      return Exporter(allTasks, 'super simple tasks backup');
    });
  });
  $(document).on({
    mouseenter: function() {
      return $new_task_input.blur();
    }
  }, '.task');
  return initialize();
});

var ChromeStorage, DB, LocalStorage;

DB = (function() {
  function DB() {}

  DB.db_key = 'todo';

  return DB;

})();

LocalStorage = (function() {
  function LocalStorage() {}

  LocalStorage.get = function(key, callback) {
    var value;
    value = localStorage.getItem(key);
    value = JSON.parse(value);
    return callback(value);
  };

  LocalStorage.getSync = function(key) {
    var value;
    value = localStorage.getItem(key);
    return JSON.parse(value);
  };

  LocalStorage.set = function(key, value) {
    value = JSON.stringify(value);
    return localStorage.setItem(key, value);
  };

  LocalStorage.remove = function(key) {
    return localStorage.removeItem(key);
  };

  return LocalStorage;

})();

ChromeStorage = (function() {
  function ChromeStorage() {}

  ChromeStorage.get = function(key, callback) {
    return chrome.storage.sync.get(key, function(value) {
      value = value[key] || null || LocalStorage.getSync(key);
      return callback(value);
    });
  };

  ChromeStorage.set = function(key, value, callback) {
    var params;
    params = {};
    params[key] = value;
    return chrome.storage.sync.set(params, function() {});
  };

  ChromeStorage.remove = function(key) {
    return chrome.storage.sync.remove(key, function() {});
  };

  if (!!window.chrome && chrome.storage) {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      var key, results, storageChange;
      results = [];
      for (key in changes) {
        if (key === DB.db_key) {
          storageChange = changes[key];
          results.push(Views.showTasks(storageChange.newValue));
        } else {
          results.push(void 0);
        }
      }
      return results;
    });
  }

  return ChromeStorage;

})();

var Arrays, Task;

Arrays = (function() {
  function Arrays() {}

  Arrays.priorities = ['none', 'minor', 'major', 'blocker'];

  Arrays.default_data = [
    {
      'id': 0,
      'isDone': false,
      'name': 'Add a new task above',
      'priority': 'blocker',
      'link': ''
    }, {
      'id': 1,
      'isDone': false,
      'name': 'Perhaps give it a priority or reorder it',
      'priority': 'minor',
      'link': ''
    }, {
      'id': 2,
      'isDone': false,
      'name': 'Refresh to see that your task is still here',
      'priority': 'minor',
      'link': ''
    }, {
      'id': 3,
      'isDone': false,
      'name': 'Reference things by attaching a URL to tasks',
      'priority': 'minor',
      'link': 'http://humphreybc.com'
    }, {
      'id': 4,
      'isDone': false,
      'name': 'Follow <a href="http://twitter.com/humphreybc" target="_blank">@humphreybc</a> on Twitter',
      'priority': 'major',
      'link': ''
    }, {
      'id': 5,
      'isDone': false,
      'name': 'Lastly, check this task off!',
      'priority': 'none',
      'link': ''
    }
  ];

  return Arrays;

})();

Task = (function() {
  function Task() {}

  Task.createTask = function(name, link) {
    var task;
    return task = {
      id: null,
      isDone: false,
      name: name,
      priority: 'none',
      link: link
    };
  };

  Task.setNewTask = function(name, link) {
    var newTask;
    if (name !== '') {
      newTask = this.createTask(name, link);
      return window.storageType.get(DB.db_key, function(allTasks) {
        allTasks.push(newTask);
        window.storageType.set(DB.db_key, allTasks);
        return Views.showTasks(allTasks);
      });
    }
  };

  Task.markDone = function(id) {
    return window.storageType.get(DB.db_key, function(allTasks) {
      var toComplete;
      toComplete = allTasks[id];
      window.storageType.set('undo', toComplete);
      allTasks.splice(id, 1);
      window.storageType.set(DB.db_key, allTasks);
      Views.showTasks(allTasks);
      return Views.undoFade();
    });
  };

  Task.updateOrder = function(oldLocation, newLocation) {
    if (oldLocation === newLocation) {
      return;
    }
    return window.storageType.get(DB.db_key, function(allTasks) {
      var toMove;
      toMove = allTasks[oldLocation];
      if (oldLocation < newLocation) {
        newLocation += 1;
      }
      allTasks.splice(newLocation, 0, toMove);
      if (newLocation < oldLocation) {
        oldLocation += 1;
      }
      allTasks.splice(oldLocation, 1);
      Task.updateTaskId(allTasks);
      window.storageType.set(DB.db_key, allTasks);
      return Views.showTasks(allTasks);
    });
  };

  Task.updateTaskId = function(allTasks) {
    var index;
    if (allTasks === null) {
      return;
    }
    index = 0;
    while (index < allTasks.length) {
      allTasks[index].id = index;
      ++index;
    }
    return allTasks;
  };

  Task.removeDoneTasks = function(allTasks) {
    var index;
    if (allTasks === null) {
      return;
    }
    index = allTasks.length - 1;
    while (index >= 0) {
      if (allTasks[index].isDone) {
        allTasks.splice(index, 1);
      }
      index--;
    }
    return allTasks;
  };

  Task.changeAttr = function(li, attr, value) {
    var array, currentIndex, id;
    if (attr === 'priority') {
      array = Arrays.priorities;
    }
    currentIndex = $.inArray(value, array);
    id = Views.getId(li);
    if (currentIndex === array.length - 1) {
      currentIndex = -1;
    }
    value = array[currentIndex + 1];
    return this.updateAttr(id, attr, value);
  };

  Task.updateAttr = function(id, attr, value) {
    return window.storageType.get(DB.db_key, function(allTasks) {
      var task;
      task = allTasks[id];
      task[attr] = value;
      window.storageType.set(DB.db_key, allTasks);
      return Views.showTasks(allTasks);
    });
  };

  Task.undoLast = function() {
    return window.storageType.get('undo', function(redo) {
      return window.storageType.get(DB.db_key, function(allTasks) {
        var position;
        position = allTasks.length;
        allTasks.splice(position, 0, redo);
        window.storageType.set(DB.db_key, allTasks);
        window.storageType.remove('undo');
        Views.showTasks(allTasks);
        return Views.undoUX();
      });
    });
  };

  Task.markAllDone = function() {
    window.storageType.set(DB.db_key, []);
    return window.storageType.get(DB.db_key, function(allTasks) {
      return Views.showTasks(allTasks);
    });
  };

  return Task;

})();

var Migrations;

Migrations = (function() {
  function Migrations() {}

  Migrations.run = function(allTasks) {
    return this.addLinkProperty(allTasks);
  };

  Migrations.addLinkProperty = function(allTasks) {
    return window.storageType.get('whats-new-2-0-1', function(whatsNew) {
      var i, j, len, task;
      if (whatsNew === null) {
        for (i = j = 0, len = allTasks.length; j < len; i = ++j) {
          task = allTasks[i];
          if (!task.hasOwnProperty('link')) {
            task.link = '';
          }
        }
        return window.storageType.set(DB.db_key, allTasks);
      }
    });
  };

  return Migrations;

})();

var Views;

Views = (function() {
  var timeout;

  function Views() {}

  timeout = 0;

  Views.getId = function(li) {
    var id;
    id = $(li).find('input').data('id');
    return parseInt(id);
  };

  Views.showTasks = function(allTasks) {
    var task_list;
    if (allTasks === void 0) {
      allTasks = [];
    }
    Task.updateTaskId(allTasks);
    Task.removeDoneTasks(allTasks);
    this.showEmptyState(allTasks);
    task_list = this.generateHTML(allTasks);
    return $('#task-list').html(task_list);
  };

  Views.generateHTML = function(allTasks) {
    var i, j, len, task, task_list;
    task_list = [];
    for (i = j = 0, len = allTasks.length; j < len; i = ++j) {
      task = allTasks[i];
      if (task.link !== '') {
        task_list[i] = '<li class="task"><label class="left"><input type="checkbox" data-id="' + task.id + '" />' + task.name + '</label>' + '<span class="right drag-handle"></span><span class="priority right" type="priority" priority="' + task.priority + '">' + task.priority + '</span><div class="task-link"><a href="' + task.link + '" target="_blank">' + task.link + '</a></div></li>';
      } else {
        task_list[i] = '<li class="task"><label class="left"><input type="checkbox" data-id="' + task.id + '" />' + task.name + '</label>' + '<span class="right drag-handle"></span><span class="priority right" type="priority" priority="' + task.priority + '">' + task.priority + '</span></li>';
      }
    }
    return task_list;
  };

  Views.showEmptyState = function(allTasks) {
    if (allTasks.length === 0) {
      $('#all-done').show();
      return $('#new-task').focus();
    } else {
      return $('#all-done').hide();
    }
  };

  Views.undoFade = function() {
    $('#undo').fadeIn();
    return timeout = setTimeout(function() {
      $('#undo').fadeOut();
      return window.storageType.remove('undo');
    }, 5000);
  };

  Views.undoUX = function() {
    clearTimeout(timeout);
    return $('#undo').fadeOut();
  };

  Views.checkOnboarding = function(allTasks, tour) {
    return window.storageType.get('sst-tour', function(sstTour) {
      if ((sstTour === null) && ($(window).width() > 600) && (allTasks.length > 0)) {
        return tour.trigger('depart.tourbus');
      }
    });
  };

  Views.checkWhatsNew = function() {
    return window.storageType.get('whats-new-2-0-1', function(whatsNew) {
      if ((whatsNew === null) && (window.tourRunning === false)) {
        return $('.whats-new').show();
      }
    });
  };

  Views.finishTour = function() {
    window.tourRunning = false;
    $('.tourbus-leg').hide();
    history.pushState('', document.title, window.location.pathname);
    return window.storageType.set('sst-tour', 1);
  };

  Views.closeWhatsNew = function() {
    return window.storageType.set('whats-new-2-0-1', 1);
  };

  return Views;

})();

var list;

list = document.querySelector('#task-list');

new Slip(list);

list.addEventListener('slip:swipe', function(e) {
  e.target.parentNode.removeChild(e.target);
  return Task.markDone(Views.getId(e.target));
});

list.addEventListener('slip:reorder', function(e) {
  var newLocation, oldLocation;
  e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
  oldLocation = e.detail.originalIndex;
  newLocation = e.detail.spliceIndex;
  return Task.updateOrder(oldLocation, newLocation);
});

list.addEventListener('slip:beforewait', (function(e) {
  if (e.target.className.indexOf('drag-handle') > -1) {
    return e.preventDefault();
  }
}), false);

var Exporter;

Exporter = function(allTasks, FileTitle) {
  var exportData, fileName, link, reg, uri;
  exportData = JSON.stringify(allTasks);
  reg = /(\,)/g;
  exportData = exportData.replace(reg, '$1\n');
  fileName = '';
  fileName += FileTitle.replace(RegExp(' ', 'g'), '_');
  uri = 'data:text/json;charset=utf-8,' + escape(exportData);
  link = document.createElement('a');
  link.href = uri;
  link.style = 'visibility:hidden';
  link.download = fileName + '.json';
  document.body.appendChild(link);
  link.click();
  return document.body.removeChild(link);
};

var slice = [].slice;

(function($) {
  var Bus, Leg, _addRule, _assemble, _busses, _dataProp, _include, _tours, methods, tourbus, uniqueId;
  tourbus = $.tourbus = function() {
    var args, method;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    method = args[0];
    if (methods.hasOwnProperty(method)) {
      args = args.slice(1);
    } else if (method instanceof $) {
      method = 'build';
    } else if (typeof method === 'string') {
      method = 'build';
      args[0] = $(args[0]);
    } else {
      $.error("Unknown method of $.tourbus --", args);
    }
    return methods[method].apply(this, args);
  };
  $.fn.tourbus = function() {
    var args;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return this.each(function() {
      args.unshift($(this));
      tourbus.apply(null, ['build'].concat(slice.call(args)));
      return this;
    });
  };
  methods = {
    build: function(el, options) {
      var built;
      if (options == null) {
        options = {};
      }
      options = $.extend(true, {}, tourbus.defaults, options);
      built = [];
      if (!(el instanceof $)) {
        el = $(el);
      }
      el.each(function() {
        return built.push(_assemble(this, options));
      });
      if (built.length === 0) {
        $.error(el.selector + " was not found!");
      }
      if (built.length === 1) {
        return built[0];
      }
      return built;
    },
    destroyAll: function() {
      var bus, index, results;
      results = [];
      for (index in _busses) {
        bus = _busses[index];
        results.push(bus.destroy());
      }
      return results;
    },
    expose: function(global) {
      return global.tourbus = {
        Bus: Bus,
        Leg: Leg
      };
    }
  };
  tourbus.defaults = {
    debug: false,
    autoDepart: false,
    target: 'body',
    startAt: 0,
    onDepart: function() {
      return null;
    },
    onStop: function() {
      return null;
    },
    onLegStart: function() {
      return null;
    },
    onLegEnd: function() {
      return null;
    },
    leg: {
      scrollTo: null,
      scrollSpeed: 150,
      scrollContext: 100,
      orientation: 'bottom',
      align: 'left',
      width: 'auto',
      margin: 10,
      top: null,
      left: null,
      arrow: "50%"
    }
  };

  /* Internal */
  Bus = (function() {
    function Bus(el, options) {
      this.id = uniqueId();
      this.$target = $(options.target);
      this.$el = $(el);
      this.$el.data({
        tourbus: this
      });
      this.options = options;
      this.currentLegIndex = null;
      this.legs = null;
      this.legEls = this.$el.children('li');
      this.totalLegs = this.legEls.length;
      this._setupEvents();
      if (this.options.autoDepart) {
        this.$el.trigger('depart.tourbus');
      }
      this._log('built tourbus with el', el.toString(), 'and options', this.options);
    }

    Bus.prototype.depart = function() {
      this.running = true;
      this.options.onDepart(this);
      this._log('departing', this);
      this.legs = this._buildLegs();
      this.currentLegIndex = this.options.startAt;
      return this.showLeg();
    };

    Bus.prototype.stop = function() {
      if (!this.running) {
        return;
      }
      if (this.legs) {
        $.each(this.legs, $.proxy(this.hideLeg, this));
      }
      this.currentLegIndex = this.options.startAt;
      this.options.onStop(this);
      return this.running = false;
    };

    Bus.prototype.on = function(event, selector, fn) {
      return this.$target.on(event, selector, fn);
    };

    Bus.prototype.currentLeg = function() {
      if (this.currentLegIndex === null) {
        return null;
      }
      return this.legs[this.currentLegIndex];
    };

    Bus.prototype.showLeg = function(index) {
      var leg, preventDefault;
      if (index == null) {
        index = this.currentLegIndex;
      }
      leg = this.legs[index];
      this._log('showLeg:', leg);
      preventDefault = this.options.onLegStart(leg, this);
      if (preventDefault !== false) {
        return leg.show();
      }
    };

    Bus.prototype.hideLeg = function(index) {
      var leg, preventDefault;
      if (index == null) {
        index = this.currentLegIndex;
      }
      leg = this.legs[index];
      this._log('hideLeg:', leg);
      preventDefault = this.options.onLegEnd(leg, this);
      if (preventDefault !== false) {
        return leg.hide();
      }
    };

    Bus.prototype.repositionLegs = function() {
      if (this.legs) {
        return $.each(this.legs, function() {
          return this.reposition();
        });
      }
    };

    Bus.prototype.next = function() {
      this.hideLeg();
      this.currentLegIndex++;
      if (this.currentLegIndex > this.totalLegs - 1) {
        return this.stop();
      }
      return this.showLeg();
    };

    Bus.prototype.prev = function(cb) {
      this.hideLeg();
      this.currentLegIndex--;
      if (this.currentLegIndex < 0) {
        return this.stop();
      }
      return this.showLeg();
    };

    Bus.prototype.destroy = function() {
      if (this.legs) {
        $.each(this.legs, function() {
          return this.destroy();
        });
      }
      this.legs = null;
      delete _busses[this.id];
      return this._teardownEvents();
    };

    Bus.prototype._buildLegs = function() {
      if (this.legs) {
        $.each(this.legs, function(_, leg) {
          return leg.destroy();
        });
      }
      return $.map(this.legEls, (function(_this) {
        return function(legEl, i) {
          var $legEl, data, leg;
          $legEl = $(legEl);
          data = $legEl.data();
          leg = new Leg({
            content: $legEl.html(),
            target: data.el || 'body',
            bus: _this,
            index: i,
            rawData: data
          });
          leg.render();
          _this.$target.append(leg.$el);
          leg._position();
          leg.hide();
          return leg;
        };
      })(this));
    };

    Bus.prototype._log = function() {
      if (!this.options.debug) {
        return;
      }
      return console.log.apply(console, ["TOURBUS " + this.id + ":"].concat(slice.call(arguments)));
    };

    Bus.prototype._setupEvents = function() {
      this.$el.on('depart.tourbus', $.proxy(this.depart, this));
      this.$el.on('stop.tourbus', $.proxy(this.stop, this));
      this.$el.on('next.tourbus', $.proxy(this.next, this));
      return this.$el.on('prev.tourbus', $.proxy(this.prev, this));
    };

    Bus.prototype._teardownEvents = function() {
      return this.$el.off('.tourbus');
    };

    return Bus;

  })();
  Leg = (function() {
    function Leg(options) {
      this.bus = options.bus;
      this.rawData = options.rawData;
      this.content = options.content;
      this.index = options.index;
      this.options = options;
      this.$target = $(options.target);
      if (this.$target.length === 0) {
        throw this.$target.selector + " is not an element!";
      }
      this._setupOptions();
      this._configureElement();
      this._configureTarget();
      this._configureScroll();
      this._setupEvents();
      this.bus._log("leg " + this.index + " made with options", this.options);
    }

    Leg.prototype.render = function() {
      var arrowClass, html;
      arrowClass = this.options.orientation === 'centered' ? '' : 'tourbus-arrow';
      this.$el.addClass(" " + arrowClass + " tourbus-arrow-" + this.options.orientation + " ");
      html = "<div class='tourbus-leg-inner'>\n  " + this.content + "\n</div>";
      this.$el.css({
        width: this.options.width
      }).html(html);
      return this;
    };

    Leg.prototype.destroy = function() {
      this.$el.remove();
      return this._teardownEvents();
    };

    Leg.prototype.reposition = function() {
      this._configureTarget();
      return this._position();
    };

    Leg.prototype._position = function() {
      var css, keys, rule, selector;
      if (this.options.orientation !== 'centered') {
        rule = {};
        keys = {
          top: 'left',
          bottom: 'left',
          left: 'top',
          right: 'top'
        };
        if (typeof this.options.arrow === 'number') {
          this.options.arrow += 'px';
        }
        rule[keys[this.options.orientation]] = this.options.arrow;
        selector = "#" + this.id + ".tourbus-arrow";
        this.bus._log("adding rule for " + this.id, rule);
        _addRule(selector + ":before, " + selector + ":after", rule);
      }
      css = this._offsets();
      this.bus._log('setting offsets on leg', css);
      return this.$el.css(css);
    };

    Leg.prototype.show = function() {
      this.$el.css({
        visibility: 'visible',
        opacity: 1.0,
        zIndex: 9999
      });
      return this.scrollIntoView();
    };

    Leg.prototype.hide = function() {
      if (this.bus.options.debug) {
        return this.$el.css({
          visibility: 'visible',
          opacity: 0.4,
          zIndex: 0
        });
      } else {
        return this.$el.css({
          visibility: 'hidden'
        });
      }
    };

    Leg.prototype.scrollIntoView = function() {
      var scrollTarget;
      if (!this.willScroll) {
        return;
      }
      scrollTarget = _dataProp(this.options.scrollTo, this.$el);
      this.bus._log('scrolling to', scrollTarget, this.scrollSettings);
      return $.scrollTo(scrollTarget, this.scrollSettings);
    };

    Leg.prototype._setupOptions = function() {
      var globalOptions;
      globalOptions = this.bus.options.leg;
      this.options.top = _dataProp(this.rawData.top, globalOptions.top);
      this.options.left = _dataProp(this.rawData.left, globalOptions.left);
      this.options.scrollTo = _dataProp(this.rawData.scrollTo, globalOptions.scrollTo);
      this.options.scrollSpeed = _dataProp(this.rawData.scrollSpeed, globalOptions.scrollSpeed);
      this.options.scrollContext = _dataProp(this.rawData.scrollContext, globalOptions.scrollContext);
      this.options.margin = _dataProp(this.rawData.margin, globalOptions.margin);
      this.options.arrow = this.rawData.arrow || globalOptions.arrow;
      this.options.align = this.rawData.align || globalOptions.align;
      this.options.width = this.rawData.width || globalOptions.width;
      return this.options.orientation = this.rawData.orientation || globalOptions.orientation;
    };

    Leg.prototype._configureElement = function() {
      this.id = "tourbus-leg-id-" + this.bus.id + "-" + this.options.index;
      this.$el = $("<div class='tourbus-leg'></div>");
      this.el = this.$el[0];
      this.$el.attr({
        id: this.id
      });
      return this.$el.css({
        zIndex: 9999
      });
    };

    Leg.prototype._setupEvents = function() {
      this.$el.on('click', '.tourbus-next', $.proxy(this.bus.next, this.bus));
      this.$el.on('click', '.tourbus-prev', $.proxy(this.bus.prev, this.bus));
      return this.$el.on('click', '.tourbus-stop', $.proxy(this.bus.stop, this.bus));
    };

    Leg.prototype._teardownEvents = function() {
      return this.$el.off('click');
    };

    Leg.prototype._configureTarget = function() {
      this.targetOffset = this.$target.offset();
      if (_dataProp(this.options.top, false)) {
        this.targetOffset.top = this.options.top;
      }
      if (_dataProp(this.options.left, false)) {
        this.targetOffset.left = this.options.left;
      }
      this.targetWidth = this.$target.outerWidth();
      return this.targetHeight = this.$target.outerHeight();
    };

    Leg.prototype._configureScroll = function() {
      this.willScroll = $.fn.scrollTo && this.options.scrollTo !== false;
      return this.scrollSettings = {
        offset: -this.options.scrollContext,
        easing: 'linear',
        axis: 'y',
        duration: this.options.scrollSpeed
      };
    };

    Leg.prototype._offsets = function() {
      var dimension, elHalf, elHeight, elWidth, offsets, targetHalf, targetHeightOverride, validOrientations;
      elHeight = this.$el.height();
      elWidth = this.$el.width();
      offsets = {};
      switch (this.options.orientation) {
        case 'centered':
          targetHeightOverride = $(window).height();
          offsets.top = this.options.top;
          if (!_dataProp(offsets.top, false)) {
            offsets.top = (targetHeightOverride / 2) - (elHeight / 2);
          }
          offsets.left = (this.targetWidth / 2) - (elWidth / 2);
          break;
        case 'left':
          offsets.top = this.targetOffset.top;
          offsets.left = this.targetOffset.left - elWidth - this.options.margin;
          break;
        case 'right':
          offsets.top = this.targetOffset.top;
          offsets.left = this.targetOffset.left + this.targetWidth + this.options.margin;
          break;
        case 'top':
          offsets.top = this.targetOffset.top - elHeight - this.options.margin;
          offsets.left = this.targetOffset.left;
          break;
        case 'bottom':
          offsets.top = this.targetOffset.top + this.targetHeight + this.options.margin;
          offsets.left = this.targetOffset.left;
      }
      validOrientations = {
        top: ['left', 'right'],
        bottom: ['left', 'right'],
        left: ['top', 'bottom'],
        right: ['top', 'bottom']
      };
      if (_include(this.options.orientation, validOrientations[this.options.align])) {
        switch (this.options.align) {
          case 'right':
            offsets.left += this.targetWidth - elWidth;
            break;
          case 'bottom':
            offsets.top += this.targetHeight - elHeight;
        }
      } else if (this.options.align === 'center') {
        if (_include(this.options.orientation, validOrientations.left)) {
          targetHalf = this.targetWidth / 2;
          elHalf = elWidth / 2;
          dimension = 'left';
        } else {
          targetHalf = this.targetHeight / 2;
          elHalf = elHeight / 2;
          dimension = 'top';
        }
        if (targetHalf > elHalf) {
          offsets[dimension] += targetHalf - elHalf;
        } else {
          offsets[dimension] -= elHalf - targetHalf;
        }
      }
      return offsets;
    };

    return Leg;

  })();
  _tours = 0;
  uniqueId = function() {
    return _tours++;
  };
  _busses = {};
  _assemble = function() {
    var bus;
    bus = (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Bus, arguments, function(){});
    _busses[bus.id] = bus;
    return bus;
  };
  _dataProp = function(possiblyFalsy, alternative) {
    if (possiblyFalsy === null || typeof possiblyFalsy === 'undefined') {
      return alternative;
    }
    return possiblyFalsy;
  };
  _include = function(value, array) {
    return $.inArray(value, array || []) !== -1;
  };
  return _addRule = (function(styleTag) {
    var sheet;
    styleTag.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(styleTag);
    sheet = document.styleSheets[document.styleSheets.length - 1];
    return function(selector, css) {
      var key, propText;
      propText = $.map((function() {
        var results;
        results = [];
        for (key in css) {
          results.push(key);
        }
        return results;
      })(), function(p) {
        return p + ":" + css[p];
      }).join(';');
      try {
        if (sheet.insertRule) {
          sheet.insertRule(selector + " { " + propText + " }", (sheet.cssRules || sheet.rules).length);
        } else {
          sheet.addRule(selector, propText);
        }
      } catch (_error) {}
    };
  })(document.createElement('style'));
})(jQuery);
