$(function() {
  if(location.href.match(/logged_in/)) {
    $.store.set('user_key', null);
    $.store.set('admin', null);
    $.store.set('apps', null);
    $.store.set('suggestions', null);
    location.href = location.href.replace(/logged_in/, '');
  }
  window.user_key = $.store.get('user_key');
  function checkForSuggestions() {
    var suggestions = $.store.get('suggestions');
    if(suggestions) {
      $("#suggestions").show();
    }
  }
  function sessionReady() {
    var user_key = $.store.get('user_key');
    var user_image = $.store.get('user_image');
    var $div = $("#nav .navbar-inner .nav-collapse");
    var $identity = $("<div/>", {'class': 'identity'});
    checkForSuggestions();
    if(!user_key || user_key == 'not_logged_in') {
      $identity.append("<a href='/login'><img src='/tools/twitter/icon.png'/> Login</a>");
    } else {
      window.user_key = user_key;
      $("body").addClass('user_key');
      $identity
        .append($("<img/>", 
          {'src': user_image}))
        .append("<a href='/filter'>" + user_key + "</a>");
      $identity
        .append("<span>&nbsp;|&nbsp;</span><a href='/logout' class='logout'>Logout</a>");
    }
    $div.append($identity);
  }
  checkForSuggestions();
  $(".logout").live('click', function() {
    $.store.set('user_key', null);
    $.store.set('user_image', null);
    $.store.set('admin', null);
    $.store.set('apps', null);
    $.store.set('suggestions', null);
  });
  var header = {};
  header[$("body").attr('data-view')] = true;
  header['allow_admin'] = $.store.get('admin');
  $("body").prepend(Handlebars.templates['header'](header));
  $("#content.container").append(Handlebars.templates['footer']());
  $.getJSON('/user_key.json', function(data) {
    $.store.set('user_key', data.user_key);
    $.store.set('user_image', data.user_image);
    $.store.set('suggestions', data.suggestions);
    $.store.set('admin', data.admin);
    $.store.set('apps', (data.apps || "").split(/,/));
    sessionReady();
  });
});

// lib/handlebars/base.js
var Handlebars = {};

Handlebars.VERSION = "1.0.beta.2";

Handlebars.helpers  = {};
Handlebars.partials = {};

Handlebars.registerHelper = function(name, fn, inverse) {
  if(inverse) { fn.not = inverse; }
  this.helpers[name] = fn;
};

Handlebars.registerPartial = function(name, str) {
  this.partials[name] = str;
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Could not find property '" + arg + "'");
  }
});

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;


  var ret = "";
  var type = Object.prototype.toString.call(context);

  if(type === "[object Function]") {
    context = context();
  }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      for(var i=0, j=context.length; i<j; i++) {
        ret = ret + fn(context[i]);
      }
    } else {
      ret = inverse(this);
    }
    return ret;
  } else {
    return fn(context);
  }
});

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var ret = "";

  if(context && context.length > 0) {
    for(var i=0, j=context.length; i<j; i++) {
      ret = ret + fn(context[i]);
    }
  } else {
    ret = inverse(this);
  }
  return ret;
});

Handlebars.registerHelper('if', function(context, options) {
  if(!context || Handlebars.Utils.isEmpty(context)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  options.fn = inverse;
  options.inverse = fn;

  return Handlebars.helpers['if'].call(this, context, options);
});

Handlebars.registerHelper('with', function(context, options) {
  return options.fn(context);
});
;
// lib/handlebars/utils.js
Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  for (var p in tmp) {
    if (tmp.hasOwnProperty(p)) { this[p] = tmp[p]; }
  }
};
Handlebars.Exception.prototype = new Error;

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

(function() {
  var escape = {
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var badChars = /&(?!\w+;)|[<>"'`]/g;
  var possible = /[&<>"'`]/;

  var escapeChar = function(chr) {
    return escape[chr] || "&amp;";
  };

  Handlebars.Utils = {
    escapeExpression: function(string) {
      // don't escape SafeStrings, since they're already safe
      if (string instanceof Handlebars.SafeString) {
        return string.toString();
      } else if (string == null || string === false) {
        return "";
      }

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    },

    isEmpty: function(value) {
      if (typeof value === "undefined") {
        return true;
      } else if (value === null) {
        return true;
      } else if (value === false) {
        return true;
      } else if(Object.prototype.toString.call(value) === "[object Array]" && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }
  };
})();;
// lib/handlebars/vm.js
Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          return Handlebars.VM.program(fn, data);
        } else if(programWrapper) {
          return programWrapper;
        } else {
          programWrapper = this.programs[i] = Handlebars.VM.program(fn);
          return programWrapper;
        }
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop
    };

    return function(context, options) {
      options = options || {};
      return templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);
    };
  },

  programWithDepth: function(fn, data, $depth) {
    var args = Array.prototype.slice.call(arguments, 2);

    return function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
  },
  program: function(fn, data) {
    return function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials) {
    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, {helpers: helpers, partials: partials});
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in vm mode");
    } else {
      partials[name] = Handlebars.compile(partial);
      return partials[name](context, {helpers: helpers, partials: partials});
    }
  }
};

Handlebars.template = Handlebars.VM.template;

(function() {
  var extensions_hash = {
    'editor_button': 'editor',
    'resource_selection': 'resources',
    'course_nav': 'course nav',
    'user_nav': 'profile nav',
    'account_nav': 'account nav',
    'homework_submission': 'homework'
  }
  var index = 0;
  Handlebars.registerHelper('checked_if_included', function(context, options) {
    return (options.hash['val'] || []).indexOf(context) == -1 ? "" : "checked";
  });
  Handlebars.registerHelper('array_as_string', function(context, options) {
    return (context || []).join(",");
  });
  Handlebars.registerHelper('each_in_hash', function(context, options) {
    var new_context = [];
    for(var idx in context) {
      new_context.push({
        key: idx,
        value: context[idx]
      });
    }
    context = new_context;
    var fn = options.fn, inverse = options.inverse;
    var ret = "";
  
    if(context && context.length > 0) {
      for(var i=0, j=context.length; i<j; i++) {
        ret = ret + fn(context[i]);
      }
    } else {
      ret = inverse(this);
    }
    return ret;
  });
  Handlebars.registerHelper('increment_index', function() {
    index++;
    return "";
  });
  Handlebars.registerHelper('current_index', function() {
    return index;
  });
  Handlebars.registerHelper('extensions_list', function(context, options) {
    var res = "";
    context = context || [];
    for(var idx = 0; idx < context.length; idx++) {
      if(extensions_hash[context[idx]]) {
        res = res + "<span class='label'>" + extensions_hash[context[idx]] + "</span>&nbsp;";
      }
    }
    return new Handlebars.SafeString(res);
  });
  Handlebars.registerHelper('round', function(context, options) {
    return Math.round(context * 10.0) / 10.0;
  });
  Handlebars.registerHelper('if_eql', function(context, options) {
    if(context == options.hash['val']) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });
  Handlebars.registerHelper('if_string', function(context, options) {
    if(typeof(context) == 'string') {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });
  Handlebars.registerHelper('full_url', function(context, options) {
    if(!context.match(/\/\//)) {
      context = location.protocol + "//" + location.host + context;
    }
    return context;
  });
  Handlebars.registerHelper('stars', function(context, options) {
    context = Math.round(context * 2.0) / 2.0;
    var context_str = context.toString().replace(/\./, '_');
    var title = "No Ratings";
    if(context) {
      title = context + " Star" + (context == 1 ? "" : "s");
    }
    var res = "<span title='" + title + "' class='stars star" + context_str + "'>";
    for(var idx = 0; idx < 5; idx++) {
      res = res + "<img data-star='" + (idx + 1) + "' class='star star" + (idx + 1) + "' src='/blank.png'/> ";
    }
    res = res + "</span>";
    return new Handlebars.SafeString(res);
  });
  Handlebars.registerHelper('small_stars', function(context, options) {
    context = Math.round(context);
    var res = "<span title='" + context + " star" + (context == 1 ? "" : "s") + "' style='line-height: 10px;'>";
    for(var idx = 0; idx < 5; idx++) {
      res = res + "<img style='width: 10px; height: 10px;' class='star" + (idx + 1) + "' src='/star" + (context > idx ? "" : "_empty") + ".png'/> ";
    }
    res = res + "</span>";
    return new Handlebars.SafeString(res);
  });
})();

// Handlebars templates
(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['admin'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;


  buffer += "<tr rel=\"/api/v1/admin/permissions/";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\">\n  <td>";
  foundHelper = helpers.username;
  stack1 = foundHelper || depth0.username;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "username", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</td>\n  <td>\n    <form class='form-inline'>\n      <input type=\"text\" class=\"apps span5\" value=\"";
  foundHelper = helpers.apps;
  stack1 = foundHelper || depth0.apps;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "apps", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      <button class=\"btn update_admin\">Update</button>\n    </form>\n  </td>\n  <td>\n    <button class=\"btn delete_admin\">Delete</button>\n  </td>\n</tr>";
  return buffer;});
templates['app_admin'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n      ";
  foundHelper = helpers.avg_rating;
  stack1 = foundHelper || depth0.avg_rating;
  foundHelper = helpers.round;
  stack2 = foundHelper || depth0.round;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "round", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + "\n    ";
  return buffer;}

  buffer += "<tr>\n  <td><a href='/index.html?tool=";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'><img src=\"";
  foundHelper = helpers.logo_url;
  stack1 = foundHelper || depth0.logo_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "logo_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" style=\"height: 20px;\"/> ";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</a></td>\n  <td>";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</td>\n  <td><a href=\"";
  foundHelper = helpers.submitter_url;
  stack1 = foundHelper || depth0.submitter_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "submitter_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.submitter_name;
  stack1 = foundHelper || depth0.submitter_name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "submitter_name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</a></td>\n  <td>";
  foundHelper = helpers.added;
  stack1 = foundHelper || depth0.added;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "added", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</td>\n  <td>";
  foundHelper = helpers.uses;
  stack1 = foundHelper || depth0.uses;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "uses", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</td>\n  <td>\n    ";
  foundHelper = helpers.avg_rating;
  stack1 = foundHelper || depth0.avg_rating;
  stack2 = helpers['if'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </td>\n  <td>\n    ";
  foundHelper = helpers.comments_count;
  stack1 = foundHelper || depth0.comments_count;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "comments_count", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n  </td>\n  <td><div class=\"description span4\">";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</div></td>\n</tr>";
  return buffer;});
templates['comment'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <img src=\"";
  foundHelper = helpers.user_avatar_url;
  stack1 = foundHelper || depth0.user_avatar_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user_avatar_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" style=\"width: 50px; height: 50px;\"/>\n        ";
  return buffer;}

function program3(depth0,data) {
  
  
  return "\n            <img src=\"/person.png\" style=\"width: 50px; height: 50px;\"/>\n        ";}

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <a href=\"";
  foundHelper = helpers.user_url;
  stack1 = foundHelper || depth0.user_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.user_name;
  stack1 = foundHelper || depth0.user_name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user_name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</a>\n        ";
  return buffer;}

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            ";
  foundHelper = helpers.user_name;
  stack1 = foundHelper || depth0.user_name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user_name", { hash: {} }); }
  buffer += escapeExpression(stack1) + " \n        ";
  return buffer;}

  buffer += "<div class='comment' id='comment_";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'>\n    <div style=\"float: left;\">\n        ";
  foundHelper = helpers.user_avatar_url;
  stack1 = foundHelper || depth0.user_avatar_url;
  stack2 = helpers['if'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(3, program3, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n    <div style=\"margin-left: 55px;\">\n        <span class=\"user_name\">\n        ";
  foundHelper = helpers.user_url;
  stack1 = foundHelper || depth0.user_url;
  stack2 = helpers['if'];
  tmp1 = self.program(5, program5, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(7, program7, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </span>\n        <span class=\"source_name\">";
  foundHelper = helpers.source_name;
  stack1 = foundHelper || depth0.source_name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "source_name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</span>\n        <span class='created'>";
  foundHelper = helpers.created;
  stack1 = foundHelper || depth0.created;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "created", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</span>\n        <br/>\n        ";
  foundHelper = helpers.rating;
  stack1 = foundHelper || depth0.rating;
  foundHelper = helpers.small_stars;
  stack2 = foundHelper || depth0.small_stars;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "small_stars", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + "<br/>\n        ";
  foundHelper = helpers.comments;
  stack1 = foundHelper || depth0.comments;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "comments", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n    </div>\n    <div style=\"clear: left;\"></div>\n</div>";
  return buffer;});
templates['config_option'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, stack3, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  
  return "checked";}

function program3(depth0,data) {
  
  
  return "select";}

function program5(depth0,data) {
  
  
  return "selected";}

  foundHelper = helpers.increment_index;
  stack1 = foundHelper || depth0.increment_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "increment_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n<tr class=\"field\">\n  <td>\n    <input type=\"text\" placeholder=\"parameter_name\" name=\"config_options[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][name]\" value=\"";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span2\"/>\n  </td>\n  <td>\n    <input type=\"text\" placeholder=\"Parameter\" name=\"config_options[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][description]\" value=\"";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span2\"/>\n  </td>\n  <td>\n    <input type=\"checkbox\" name=\"config_options[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][required]\" ";
  foundHelper = helpers.required;
  stack1 = foundHelper || depth0.required;
  stack2 = helpers['if'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " value=\"1\"/>\n  </td>\n  <td>\n    <select name=\"config_options[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][type]\" class=\"span2\">\n       <option ";
  foundHelper = helpers.type;
  stack1 = foundHelper || depth0.type;
  stack2 = {};
  stack3 = "text";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(3, program3, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">text</option>\n       <option ";
  foundHelper = helpers.type;
  stack1 = foundHelper || depth0.type;
  stack2 = {};
  stack3 = "checkbox";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(5, program5, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">checkbox</option>\n    </select>\n  </td>\n  <td>\n    <input type=\"text\" placeholder=\"default\" name=\"config_options[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][value]\" value=\"";
  foundHelper = helpers.value;
  stack1 = foundHelper || depth0.value;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "value", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span2\"/>\n  </td>\n  <td>\n    <button class=\"btn delete_field\" type='button'>Delete</button>\n  </td>\n</tr>\n";
  return buffer;});
templates['config_url'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;


  foundHelper = helpers.increment_index;
  stack1 = foundHelper || depth0.increment_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "increment_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n<div class=\"field\">\n  <input type=\"text\" name=\"config_urls[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][url]\" value=\"";
  foundHelper = helpers.url;
  stack1 = foundHelper || depth0.url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" placeholder=\"https://\" class=\"span4\"/>\n  <input type=\"text\" name=\"config_urls[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][description]\" value=\"";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" placeholder=\"config name\"/>\n  <button class=\"btn delete_field\" type='button'>Delete</button>\n</div>\n";
  return buffer;});
templates['custom_field'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;


  foundHelper = helpers.increment_index;
  stack1 = foundHelper || depth0.increment_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "increment_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n<div class=\"field\">\n  <input type=\"text\" name=\"custom_fields[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][key]\" value=\"";
  foundHelper = helpers.key;
  stack1 = foundHelper || depth0.key;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "key", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" placeholder=\"key name\"/>\n  <input type=\"text\" name=\"custom_fields[";
  foundHelper = helpers.current_index;
  stack1 = foundHelper || depth0.current_index;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "current_index", { hash: {} }); }
  buffer += escapeExpression(stack1) + "][value]\" value=\"";
  foundHelper = helpers.value;
  stack1 = foundHelper || depth0.value;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "value", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" placeholder=\"value\"/>\n  <button class=\"btn delete_field\" type='button'>Delete</button>\n</div>\n";
  return buffer;});
templates['data_entry'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;


  buffer += "<tr class=\"record\">\n  <td class=\"tally\">\n    <a href=\"";
  foundHelper = helpers.url;
  stack1 = foundHelper || depth0.url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" target=\"_blank\">\n      <img src=\"";
  foundHelper = helpers.image_url;
  stack1 = foundHelper || depth0.image_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "image_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" style=\"height: 20px; max-width: 30px;\"/>\n    </a>\n    <div><span class=\"cnt\"></span> / <span class=\"total\"></span></div>\n  </td>\n  <td>\n    <input type=\"text\" class=\"title span2\" placeholder=\"Resource name\" value=\"";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n  </td>\n  <td>\n    <input type=\"text\" class=\"url span3\" placeholder=\"https recommended\" value=\"";
  foundHelper = helpers.url;
  stack1 = foundHelper || depth0.url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n  </td>\n  <td>\n    <input type=\"text\" class=\"image_url span3\" placeholder=\"https recommended\" value=\"";
  foundHelper = helpers.image_url;
  stack1 = foundHelper || depth0.image_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "image_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n  </td>\n  <td>\n    <textarea class=\"desc span4\" placeholder=\"Resource description\">";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</textarea>\n  </td>\n  <td>\n    <button class='btn delete'>Delete</button>\n  </td>\n</tr>";
  return buffer;});
templates['footer'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var foundHelper, self=this;


  return "<footer class=\"footer\" style=\"text-align: center; padding-top: 5px;\">\n  <p>This site and its contents are <a href=\"https://github.com/whitmer/edu_apps\">available on GitHub</a> under the MIT license. \n  Official IMS LTI docs are found on the <a href=\"http://www.imsglobal.org/lti/\">IMS page</a>. \n  <br/>Also\n  check out IMS's <a href=\"http://www.imsglobal.org/lti\">LTI Directory</a> and details on\n  <a href=\"http://www.imscert.org\">LTI Conformance</a>.</p>\n</footer>\n";});
templates['header'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this;

function program1(depth0,data) {
  
  
  return " class=\"active\"";}

function program3(depth0,data) {
  
  
  return " class=\"active\"";}

function program5(depth0,data) {
  
  
  return " class=\"active\"";}

function program7(depth0,data) {
  
  
  return "active ";}

function program9(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n            <li";
  foundHelper = helpers.admin;
  stack1 = foundHelper || depth0.admin;
  stack2 = helpers['if'];
  tmp1 = self.program(10, program10, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "><a href=\"/admin\">Admin</a></li>\n          ";
  return buffer;}
function program10(depth0,data) {
  
  
  return " class=\"active\"";}

function program12(depth0,data) {
  
  
  return " class=\"active\"";}

  buffer += "<div id=\"nav\" class=\"navbar navbar-fixed-top\">\n  <div class=\"navbar-inner\">\n    <div class=\"container\">\n      <a class=\"brand\" href=\"/index.html\">Edu Apps</a>\n      <div class=\"nav-collapse\">\n        <ul class=\"nav\">\n          <li";
  foundHelper = helpers.index;
  stack1 = foundHelper || depth0.index;
  stack2 = helpers['if'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "><a href=\"/index.html\">Home</a></li>\n          <li";
  foundHelper = helpers.talk;
  stack1 = foundHelper || depth0.talk;
  stack2 = helpers['if'];
  tmp1 = self.program(3, program3, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "><a href=\"/talk.html\">Talk</a></li>\n          <li";
  foundHelper = helpers.tutorials;
  stack1 = foundHelper || depth0.tutorials;
  stack2 = helpers['if'];
  tmp1 = self.program(5, program5, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "><a href=\"/tutorials.html\">Tutorials</a></li>\n          <li class=\"";
  foundHelper = helpers.coding;
  stack1 = foundHelper || depth0.coding;
  stack2 = helpers['if'];
  tmp1 = self.program(7, program7, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " dropdown\">\n              <a href=\"/code.html\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">Coding <span class='caret' style=\"color: #fff;\"></span></a>\n              <ul class=\"dropdown-menu\">\n                  <li><a href=\"/code.html\">Basics</a></li>\n                  <li><a href=\"/extensions/index.html\">Extensions</a></li>\n                  <li><a href=\"/build_xml.html\">XML</a></li>\n                  <li><a href=\"/api.html\">API</a></li>\n                  <li class=\"divider\"></li>\n                  <li><a href=\"https://github.com/whitmer/edu_apps\">Source</a></li>\n              </ul>\n          </li>\n          ";
  foundHelper = helpers.allow_admin;
  stack1 = foundHelper || depth0.allow_admin;
  stack2 = helpers['if'];
  tmp1 = self.program(9, program9, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          <li";
  foundHelper = helpers.suggestions;
  stack1 = foundHelper || depth0.suggestions;
  stack2 = helpers['if'];
  tmp1 = self.program(12, program12, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " style=\"display: none;\" id=\"suggestions\"><a href=\"/suggestions\">Suggest / Submit</a></li>\n        </ul>\n      </div>\n    </div>\n  </div>\n</div>\n";
  return buffer;});
templates['lti_outcome'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          <resultScore>\n            <language>en</language>\n            <textString>";
  foundHelper = helpers.score;
  stack1 = foundHelper || depth0.score;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "score", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</textString>\n          </resultScore>\n          ";
  return buffer;}

function program3(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n          <!-- Added element -->\n          <resultData>\n            ";
  foundHelper = helpers.resultData;
  stack1 = foundHelper || depth0.resultData;
  stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.text);
  stack2 = helpers['if'];
  tmp1 = self.program(4, program4, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  foundHelper = helpers.resultData;
  stack1 = foundHelper || depth0.resultData;
  stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.url);
  stack2 = helpers['if'];
  tmp1 = self.program(6, program6, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          </resultData>\n          ";
  return buffer;}
function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <text>";
  foundHelper = helpers.resultData;
  stack1 = foundHelper || depth0.resultData;
  stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.text);
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "resultData.text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</text>\n            ";
  return buffer;}

function program6(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n            ";
  foundHelper = helpers.resultData;
  stack1 = foundHelper || depth0.resultData;
  stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.text);
  stack2 = helpers.unless;
  tmp1 = self.program(7, program7, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  return buffer;}
function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <url>";
  foundHelper = helpers.resultData;
  stack1 = foundHelper || depth0.resultData;
  stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.url);
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "resultData.url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</url>  \n            ";
  return buffer;}

  buffer += "<?xml version = \"1.0\" encoding = \"UTF-8\"?>\n<imsx_POXEnvelopeRequest xmlns=\"http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0\">\n  <imsx_POXHeader>\n    <imsx_POXRequestHeaderInfo>\n      <imsx_version>V1.0</imsx_version>\n      <imsx_messageIdentifier>999999123</imsx_messageIdentifier>\n    </imsx_POXRequestHeaderInfo>\n  </imsx_POXHeader>\n  <imsx_POXBody>\n    <replaceResultRequest>\n      <resultRecord>\n        <sourcedGUID>\n          <sourcedId>";
  foundHelper = helpers.sourced_id;
  stack1 = foundHelper || depth0.sourced_id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "sourced_id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</sourcedId>\n        </sourcedGUID>\n        <result>\n          ";
  foundHelper = helpers.score;
  stack1 = foundHelper || depth0.score;
  stack2 = helpers['if'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  foundHelper = helpers.resultData;
  stack1 = foundHelper || depth0.resultData;
  stack2 = helpers['if'];
  tmp1 = self.program(3, program3, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </result>\n      </resultRecord>\n    </replaceResultRequest>\n  </imsx_POXBody>\n</imsx_POXEnvelopeRequest>";
  return buffer;});
templates['lti_xml'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <blti:launch_url>";
  foundHelper = helpers.launch_url;
  stack1 = foundHelper || depth0.launch_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "launch_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</blti:launch_url>\n    ";
  return buffer;}

function program3(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n      <blti:custom>\n        ";
  foundHelper = helpers.custom_fields;
  stack1 = foundHelper || depth0.custom_fields;
  stack2 = helpers.each;
  tmp1 = self.program(4, program4, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </blti:custom>\n    ";
  return buffer;}
function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <lticm:property name=\"";
  foundHelper = helpers.key;
  stack1 = foundHelper || depth0.key;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "key", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.val;
  stack1 = foundHelper || depth0.val;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "val", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  return buffer;}

function program6(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <lticm:property name=\"tool_id\">";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n      ";
  return buffer;}

function program8(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <lticm:property name=\"domain\">";
  foundHelper = helpers.domain;
  stack1 = foundHelper || depth0.domain;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "domain", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n      ";
  return buffer;}

function program10(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n      <lticm:options name=\"editor_button\">\n        <lticm:property name=\"url\">";
  foundHelper = helpers.editor_button_launch_url;
  stack1 = foundHelper || depth0.editor_button_launch_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "editor_button_launch_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  foundHelper = helpers.editor_button_icon_url;
  stack1 = foundHelper || depth0.editor_button_icon_url;
  stack2 = helpers['if'];
  tmp1 = self.program(11, program11, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <lticm:property name=\"text\">";
  foundHelper = helpers.editor_button_link_text;
  stack1 = foundHelper || depth0.editor_button_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "editor_button_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"selection_width\">";
  foundHelper = helpers.editor_button_width;
  stack1 = foundHelper || depth0.editor_button_width;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "editor_button_width", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"selection_height\">";
  foundHelper = helpers.editor_button_height;
  stack1 = foundHelper || depth0.editor_button_height;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "editor_button_height", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"enabled\">true</lticm:property>\n      </lticm:options>\n      ";
  return buffer;}
function program11(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <lticm:property name=\"icon_url\">";
  foundHelper = helpers.editor_button_icon_url;
  stack1 = foundHelper || depth0.editor_button_icon_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "editor_button_icon_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  return buffer;}

function program13(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n      <lticm:options name=\"resource_selection\">\n        <lticm:property name=\"url\">";
  foundHelper = helpers.resource_selection_launch_url;
  stack1 = foundHelper || depth0.resource_selection_launch_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "resource_selection_launch_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  foundHelper = helpers.resource_selection_icon_url;
  stack1 = foundHelper || depth0.resource_selection_icon_url;
  stack2 = helpers['if'];
  tmp1 = self.program(14, program14, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <lticm:property name=\"text\">";
  foundHelper = helpers.resource_selection_link_text;
  stack1 = foundHelper || depth0.resource_selection_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "resource_selection_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"selection_width\">";
  foundHelper = helpers.resource_selection_width;
  stack1 = foundHelper || depth0.resource_selection_width;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "resource_selection_width", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"selection_height\">";
  foundHelper = helpers.resource_selection_height;
  stack1 = foundHelper || depth0.resource_selection_height;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "resource_selection_height", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"enabled\">true</lticm:property>\n      </lticm:options>\n      ";
  return buffer;}
function program14(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <lticm:property name=\"icon_url\">";
  foundHelper = helpers.resource_selection_icon_url;
  stack1 = foundHelper || depth0.resource_selection_icon_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "resource_selection_icon_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  return buffer;}

function program16(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n      <lticm:options name=\"homework_submission\">\n        <lticm:property name=\"url\">";
  foundHelper = helpers.homework_submission_launch_url;
  stack1 = foundHelper || depth0.homework_submission_launch_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "homework_submission_launch_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  foundHelper = helpers.homework_submission_icon_url;
  stack1 = foundHelper || depth0.homework_submission_icon_url;
  stack2 = helpers['if'];
  tmp1 = self.program(17, program17, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <lticm:property name=\"text\">";
  foundHelper = helpers.homework_submission_link_text;
  stack1 = foundHelper || depth0.homework_submission_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "homework_submission_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"selection_width\">";
  foundHelper = helpers.homework_submission_width;
  stack1 = foundHelper || depth0.homework_submission_width;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "homework_submission_width", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"selection_height\">";
  foundHelper = helpers.homework_submission_height;
  stack1 = foundHelper || depth0.homework_submission_height;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "homework_submission_height", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"enabled\">true</lticm:property>\n      </lticm:options>\n      ";
  return buffer;}
function program17(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <lticm:property name=\"icon_url\">";
  foundHelper = helpers.homework_submission_icon_url;
  stack1 = foundHelper || depth0.homework_submission_icon_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "homework_submission_icon_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  return buffer;}

function program19(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n      <lticm:options name=\"course_navigation\">\n        <lticm:property name=\"url\">";
  foundHelper = helpers.course_navigation_launch_url;
  stack1 = foundHelper || depth0.course_navigation_launch_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "course_navigation_launch_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"text\">";
  foundHelper = helpers.course_navigation_link_text;
  stack1 = foundHelper || depth0.course_navigation_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "course_navigation_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  foundHelper = helpers.course_navigation_visibility;
  stack1 = foundHelper || depth0.course_navigation_visibility;
  stack2 = helpers['if'];
  tmp1 = self.program(20, program20, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  foundHelper = helpers.course_navigation_default;
  stack1 = foundHelper || depth0.course_navigation_default;
  stack2 = helpers['if'];
  tmp1 = self.program(22, program22, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <lticm:property name=\"enabled\">true</lticm:property>\n      </lticm:options>\n      ";
  return buffer;}
function program20(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <lticm:property name=\"visibility\">";
  foundHelper = helpers.course_navigation_visibility;
  stack1 = foundHelper || depth0.course_navigation_visibility;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "course_navigation_visibility", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  return buffer;}

function program22(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <lticm:property name=\"default\">";
  foundHelper = helpers.course_navigation_default;
  stack1 = foundHelper || depth0.course_navigation_default;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "course_navigation_default", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        ";
  return buffer;}

function program24(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <lticm:options name=\"account_navigation\">\n        <lticm:property name=\"url\">";
  foundHelper = helpers.account_navigation_launch_url;
  stack1 = foundHelper || depth0.account_navigation_launch_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "account_navigation_launch_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"text\">";
  foundHelper = helpers.account_navigation_link_text;
  stack1 = foundHelper || depth0.account_navigation_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "account_navigation_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"enabled\">true</lticm:property>\n      </lticm:options>\n      ";
  return buffer;}

function program26(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <lticm:options name=\"user_navigation\">\n        <lticm:property name=\"url\">";
  foundHelper = helpers.user_navigation_launch_url;
  stack1 = foundHelper || depth0.user_navigation_launch_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user_navigation_launch_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"text\">";
  foundHelper = helpers.user_navigation_link_text;
  stack1 = foundHelper || depth0.user_navigation_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user_navigation_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n        <lticm:property name=\"enabled\">true</lticm:property>\n      </lticm:options>\n      ";
  return buffer;}

  buffer += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<cartridge_basiclti_link xmlns=\"http://www.imsglobal.org/xsd/imslticc_v1p0\"\n    xmlns:blti = \"http://www.imsglobal.org/xsd/imsbasiclti_v1p0\"\n    xmlns:lticm =\"http://www.imsglobal.org/xsd/imslticm_v1p0\"\n    xmlns:lticp =\"http://www.imsglobal.org/xsd/imslticp_v1p0\"\n    xmlns:xsi = \"http://www.w3.org/2001/XMLSchema-instance\"\n    xsi:schemaLocation = \"http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd\n    http://www.imsglobal.org/xsd/imsbasiclti_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0.xsd\n    http://www.imsglobal.org/xsd/imslticm_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd\n    http://www.imsglobal.org/xsd/imslticp_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd\">\n    <blti:title>";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</blti:title>\n    <blti:description>";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</blti:description>\n    <blti:icon>";
  foundHelper = helpers.icon_url;
  stack1 = foundHelper || depth0.icon_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "icon_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</blti:icon>\n    ";
  foundHelper = helpers.launch_url;
  stack1 = foundHelper || depth0.launch_url;
  stack2 = helpers['if'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  foundHelper = helpers.custom_fields;
  stack1 = foundHelper || depth0.custom_fields;
  stack2 = helpers['if'];
  tmp1 = self.program(3, program3, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    \n    <blti:extensions platform=\"canvas.instructure.com\">\n      ";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  stack2 = helpers['if'];
  tmp1 = self.program(6, program6, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      <lticm:property name=\"privacy_level\">";
  foundHelper = helpers.privacy_level;
  stack1 = foundHelper || depth0.privacy_level;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "privacy_level", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</lticm:property>\n      ";
  foundHelper = helpers.domain;
  stack1 = foundHelper || depth0.domain;
  stack2 = helpers['if'];
  tmp1 = self.program(8, program8, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.editor_button;
  stack1 = foundHelper || depth0.editor_button;
  stack2 = helpers['if'];
  tmp1 = self.program(10, program10, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.resource_selection;
  stack1 = foundHelper || depth0.resource_selection;
  stack2 = helpers['if'];
  tmp1 = self.program(13, program13, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.homework_submission;
  stack1 = foundHelper || depth0.homework_submission;
  stack2 = helpers['if'];
  tmp1 = self.program(16, program16, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.course_navigation;
  stack1 = foundHelper || depth0.course_navigation;
  stack2 = helpers['if'];
  tmp1 = self.program(19, program19, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.account_navigation;
  stack1 = foundHelper || depth0.account_navigation;
  stack2 = helpers['if'];
  tmp1 = self.program(24, program24, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.user_navigation;
  stack1 = foundHelper || depth0.user_navigation;
  stack2 = helpers['if'];
  tmp1 = self.program(26, program26, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </blti:extensions>\n    \n    <cartridge_bundle identifierref=\"BLTI001_Bundle\"/>\n    <cartridge_icon identifierref=\"BLTI001_Icon\"/>\n</cartridge_basiclti_link>  \n";
  return buffer;});
templates['tool'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var stack1, stack2;
  foundHelper = helpers.select;
  stack1 = foundHelper || depth0.select;
  stack2 = helpers['if'];
  tmp1 = self.program(2, program2, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(4, program4, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { return stack1; }
  else { return ''; }}
function program2(depth0,data) {
  
  
  return "10";}

function program4(depth0,data) {
  
  
  return "7";}

function program6(depth0,data) {
  
  
  return "3";}

function program8(depth0,data) {
  
  
  return "single_app offset1";}

function program10(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                    <img src='";
  foundHelper = helpers.banner_url;
  stack1 = foundHelper || depth0.banner_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "banner_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "' alt='' class=\"banner\"/>\n                ";
  return buffer;}

function program12(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                    <img src='";
  foundHelper = helpers.logo_url;
  stack1 = foundHelper || depth0.logo_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "logo_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "' alt='' class=\"logo\"/>\n                ";
  return buffer;}

function program14(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                <span class='rating_summary' style=\"display: block;\">\n                    ";
  foundHelper = helpers.ratings_count;
  stack1 = foundHelper || depth0.ratings_count;
  stack2 = helpers['if'];
  tmp1 = self.program(15, program15, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(17, program17, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                </span>\n            ";
  return buffer;}
function program15(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                        ";
  foundHelper = helpers.avg_rating;
  stack1 = foundHelper || depth0.avg_rating;
  foundHelper = helpers.stars;
  stack2 = foundHelper || depth0.stars;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "stars", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + " ";
  foundHelper = helpers.ratings_count;
  stack1 = foundHelper || depth0.ratings_count;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "ratings_count", { hash: {} }); }
  buffer += escapeExpression(stack1) + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img src='/comments.png'/> ";
  foundHelper = helpers.comments_count;
  stack1 = foundHelper || depth0.comments_count;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "comments_count", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n                    ";
  return buffer;}

function program17(depth0,data) {
  
  
  return "\n                        No Ratings\n                    ";}

function program19(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n              ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers.unless;
  tmp1 = self.program(20, program20, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  return buffer;}
function program20(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                <div style='width: 55px;' class='voter'><a href='https://twitter.com/share' class='twitter-share-button' data-lang='en' data-count='vertical' data-url='";
  foundHelper = helpers.refUrl;
  stack1 = foundHelper || depth0.refUrl;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "refUrl", { hash: {} }); }
  buffer += escapeExpression(stack1) + "' data-text='LTI Tool: ";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'>Tweet</a></div>\n                <div class='voter fb-like' data-send='false' data-layout='box_count' data-width='55' data-show-faces='false' data-href='";
  foundHelper = helpers.refUrl;
  stack1 = foundHelper || depth0.refUrl;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "refUrl", { hash: {} }); }
  buffer += escapeExpression(stack1) + "' style='width: 55px;'></div>\n                <div style='padding-top: 1px; margin-right: 7px;' class='voter'><div class='g-plusone' data-annotation='bubble' data-size='tall' data-width='55' data-href='";
  foundHelper = helpers.refUrl;
  stack1 = foundHelper || depth0.refUrl;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "refUrl", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'></div></div>\n              ";
  return buffer;}

function program22(depth0,data) {
  
  
  return "\n              <div><b>NOTE:</b> Remember this URL if you want to update app settings, as it won't show up in the directory until it's approved. Also, HTML tags are escaped until the app is approved.</div><br/>\n            ";}

function program24(depth0,data) {
  
  
  return "\n                <span class='label label-important'>NEW</span>&nbsp;\n            ";}

function program26(depth0,data) {
  
  
  return "\n                <span class='label label-info'>BETA</span>&nbsp;\n            ";}

function program28(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n            <span style=\"display: block;\" class='ratings_on_hover'>\n                ";
  foundHelper = helpers.ratings_count;
  stack1 = foundHelper || depth0.ratings_count;
  stack2 = helpers['if'];
  tmp1 = self.program(29, program29, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(31, program31, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </span>\n        ";
  return buffer;}
function program29(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                    ";
  foundHelper = helpers.avg_rating;
  stack1 = foundHelper || depth0.avg_rating;
  foundHelper = helpers.stars;
  stack2 = foundHelper || depth0.stars;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "stars", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + " ";
  foundHelper = helpers.ratings_count;
  stack1 = foundHelper || depth0.ratings_count;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "ratings_count", { hash: {} }); }
  buffer += escapeExpression(stack1) + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img src='/comments.png'/> ";
  foundHelper = helpers.comments_count;
  stack1 = foundHelper || depth0.comments_count;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "comments_count", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n                ";
  return buffer;}

function program31(depth0,data) {
  
  
  return "\n                    &nbsp;\n                ";}

function program33(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n        <span class='config alert alert-info' style=\"display: block;\">\n        ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(34, program34, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  foundHelper = helpers.select;
  stack1 = foundHelper || depth0.select;
  stack2 = helpers['if'];
  tmp1 = self.program(53, program53, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(59, program59, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  foundHelper = helpers.extensions_or_preview;
  stack1 = foundHelper || depth0.extensions_or_preview;
  stack2 = helpers['if'];
  tmp1 = self.program(63, program63, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </span>\n    ";
  return buffer;}
function program34(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n            ";
  foundHelper = helpers.has_config_url;
  stack1 = foundHelper || depth0.has_config_url;
  stack2 = helpers['if'];
  tmp1 = self.program(35, program35, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(50, program50, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  return buffer;}
function program35(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                ";
  foundHelper = helpers.config_options;
  stack1 = foundHelper || depth0.config_options;
  stack2 = helpers.each;
  tmp1 = self.program(36, program36, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                <span>\n                ";
  foundHelper = helpers.config_urls;
  stack1 = foundHelper || depth0.config_urls;
  stack2 = helpers['if'];
  tmp1 = self.programWithDepth(program41, data, depth0);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.programWithDepth(program47, data, depth0);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                </span>\n            ";
  return buffer;}
function program36(depth0,data) {
  
  var buffer = "", stack1, stack2, stack3;
  buffer += "\n                    ";
  foundHelper = helpers.type;
  stack1 = foundHelper || depth0.type;
  stack2 = {};
  stack3 = "checkbox";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(37, program37, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(39, program39, data);
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                    <br/>\n                ";
  return buffer;}
function program37(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                        <span class='form-horizontal'><label><input style='margin: -4px 3px 0 0;' type='checkbox' class='config_option' name='";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "' value='";
  foundHelper = helpers.value;
  stack1 = foundHelper || depth0.value;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "value", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'/> ";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</label></span>\n                    ";
  return buffer;}

function program39(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                        <span class='form-horizontal'><label>";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + ": <input type='text' class='config_option' name='";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "' value='";
  foundHelper = helpers.value;
  stack1 = foundHelper || depth0.value;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "value", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'/></label></span>\n                    ";
  return buffer;}

function program41(depth0,data,depth1) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                    ";
  foundHelper = helpers.config_urls;
  stack1 = foundHelper || depth0.config_urls;
  stack2 = helpers.each;
  tmp1 = self.programWithDepth(program42, data, depth1);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                ";
  return buffer;}
function program42(depth0,data,depth2) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                        <label>\n                           ";
  foundHelper = helpers.select;
  stack1 = foundHelper || depth2.select;
  stack2 = helpers['if'];
  tmp1 = self.program(43, program43, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                          ";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + " <input type='text' title='copy this URL and paste it into the tool configuration in your LMS' class='config_field' value='";
  foundHelper = helpers.url;
  stack1 = foundHelper || depth0.url;
  foundHelper = helpers.full_url;
  stack2 = foundHelper || depth0.full_url;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "full_url", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + "' ";
  foundHelper = helpers.select;
  stack1 = foundHelper || depth2.select;
  stack2 = helpers['if'];
  tmp1 = self.program(45, program45, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "/>\n                        </label>                  \n                    ";
  return buffer;}
function program43(depth0,data) {
  
  
  return "<input class=\"config_url_radio\" type='radio' name='config_url'/>";}

function program45(depth0,data) {
  
  
  return "style=\"display: none;\"";}

function program47(depth0,data,depth1) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                    <label ";
  foundHelper = helpers.select;
  stack1 = foundHelper || depth1.select;
  stack2 = helpers['if'];
  tmp1 = self.program(48, program48, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">configuration url: <input type='text' title='copy this URL and paste it into the tool configuration in your LMS' class='config_field' value='";
  foundHelper = helpers.config_url;
  stack1 = foundHelper || depth0.config_url;
  foundHelper = helpers.full_url;
  stack2 = foundHelper || depth0.full_url;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "full_url", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + "'/>\n                    </label>                        \n                ";
  return buffer;}
function program48(depth0,data) {
  
  
  return "style=\"display: none;\"";}

function program50(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                ";
  foundHelper = helpers.config_dir;
  stack1 = foundHelper || depth0.config_dir;
  stack2 = helpers['if'];
  tmp1 = self.program(51, program51, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  return buffer;}
function program51(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                    ";
  foundHelper = helpers.config_dir;
  stack1 = foundHelper || depth0.config_dir;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "config_dir", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n                ";
  return buffer;}

function program53(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n          ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(54, program54, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  return buffer;}
function program54(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n            ";
  foundHelper = helpers.any_key;
  stack1 = foundHelper || depth0.any_key;
  stack2 = helpers.unless;
  tmp1 = self.program(55, program55, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            <a id='install' class='btn btn-primary' href='#install'>Install</a>\n            ";
  foundHelper = helpers.preview;
  stack1 = foundHelper || depth0.preview;
  stack2 = helpers['if'];
  tmp1 = self.program(57, program57, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            <a id='cancel' class='btn' href='#back'>Cancel</a>\n          ";
  return buffer;}
function program55(depth0,data) {
  
  
  return "\n              <span class='form-horizontal'><label>Consumer Key: <input type='text' id='key' name='key'/></label></span>\n              <span class='form-horizontal'><label>Shared Secret: <input type='text' id='secret' name='secret'/></label></span>\n            ";}

function program57(depth0,data) {
  
  
  return "\n              <a id='preview' class='btn' href='#preview'>Preview</a>\n            ";}

function program59(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n          ";
  foundHelper = helpers.preview;
  stack1 = foundHelper || depth0.preview;
  stack2 = helpers['if'];
  tmp1 = self.program(60, program60, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  return buffer;}
function program60(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n              ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(61, program61, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  return buffer;}
function program61(depth0,data) {
  
  
  return "\n                  <a id='preview' class='btn btn-primary' href='#preview'>Preview</a>\n              ";}

function program63(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n            <span style=\"display: block;\" class='extensions'>\n              ";
  foundHelper = helpers.preview;
  stack1 = foundHelper || depth0.preview;
  stack2 = helpers['if'];
  tmp1 = self.program(64, program64, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  foundHelper = helpers.ims_link;
  stack1 = foundHelper || depth0.ims_link;
  stack2 = helpers['if'];
  tmp1 = self.program(69, program69, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  foundHelper = helpers.extensions;
  stack1 = foundHelper || depth0.extensions;
  foundHelper = helpers.extensions_list;
  stack2 = foundHelper || depth0.extensions_list;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "extensions_list", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + "\n            </span>\n        ";
  return buffer;}
function program64(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n                ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(65, program65, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(67, program67, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  return buffer;}
function program65(depth0,data) {
  
  
  return "\n                    <span class='label label-info'>preview</span>\n                ";}

function program67(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                    <a href=\"?tool=";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "#preview\">\n                        <span class='label label-info'>preview</span></a>\n                ";
  return buffer;}

function program69(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                <a href=\"";
  foundHelper = helpers.ims_link;
  stack1 = foundHelper || depth0.ims_link;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "ims_link", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"><span class='label' title='IMS Certified'>IMS</span></a>\n              ";
  return buffer;}

function program71(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n    <span id=\"";
  foundHelper = helpers.select;
  stack1 = foundHelper || depth0.select;
  stack2 = helpers.unless;
  tmp1 = self.program(72, program72, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" class='";
  foundHelper = helpers.select;
  stack1 = foundHelper || depth0.select;
  stack2 = helpers['if'];
  tmp1 = self.program(74, program74, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(76, program76, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " app well' style=\"padding: 0;\">\n      <span id=\"sidebar_content\">\n      ";
  foundHelper = helpers.select;
  stack1 = foundHelper || depth0.select;
  stack2 = helpers.unless;
  tmp1 = self.program(78, program78, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.any_key;
  stack1 = foundHelper || depth0.any_key;
  stack2 = helpers['if'];
  tmp1 = self.program(81, program81, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.costs_money;
  stack1 = foundHelper || depth0.costs_money;
  stack2 = helpers['if'];
  tmp1 = self.program(83, program83, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.beta;
  stack1 = foundHelper || depth0.beta;
  stack2 = helpers['if'];
  tmp1 = self.program(85, program85, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.only_works;
  stack1 = foundHelper || depth0.only_works;
  stack2 = helpers['if'];
  tmp1 = self.program(87, program87, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.doesnt_work;
  stack1 = foundHelper || depth0.doesnt_work;
  stack2 = helpers['if'];
  tmp1 = self.program(89, program89, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.support_link;
  stack1 = foundHelper || depth0.support_link;
  stack2 = helpers['if'];
  tmp1 = self.program(91, program91, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.ims_link;
  stack1 = foundHelper || depth0.ims_link;
  stack2 = helpers['if'];
  tmp1 = self.program(93, program93, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.related;
  stack1 = foundHelper || depth0.related;
  stack2 = helpers['if'];
  tmp1 = self.program(95, program95, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  foundHelper = helpers.user_key;
  stack1 = foundHelper || depth0.user_key;
  stack2 = helpers['if'];
  tmp1 = self.program(98, program98, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </span>\n    </span>\n";
  return buffer;}
function program72(depth0,data) {
  
  
  return "app_sidebar";}

function program74(depth0,data) {
  
  
  return "span10 offset1";}

function program76(depth0,data) {
  
  
  return "span3";}

function program78(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n        <span class='rating note'>\n          ";
  foundHelper = helpers.show_votes;
  stack1 = foundHelper || depth0.show_votes;
  stack2 = helpers['if'];
  tmp1 = self.program(79, program79, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </span>\n      ";
  return buffer;}
function program79(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n              <div style='width: 55px;' class='voter'><a href='https://twitter.com/share' class='twitter-share-button' data-lang='en' data-count='vertical' data-url='";
  foundHelper = helpers.refUrl;
  stack1 = foundHelper || depth0.refUrl;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "refUrl", { hash: {} }); }
  buffer += escapeExpression(stack1) + "' data-text='LTI Tool: ";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'>Tweet</a></div>\n              <div class='voter fb-like' data-send='false' data-layout='box_count' data-width='55' data-show-faces='false' data-href='";
  foundHelper = helpers.refUrl;
  stack1 = foundHelper || depth0.refUrl;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "refUrl", { hash: {} }); }
  buffer += escapeExpression(stack1) + "' style='width: 55px;'></div>\n              <div style='padding-top: 1px; margin-left: 7px;' class='voter'><div class='g-plusone' data-annotation='bubble' data-size='tall' data-width='55' data-href='";
  foundHelper = helpers.refUrl;
  stack1 = foundHelper || depth0.refUrl;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "refUrl", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'></div></div>\n              <div style='clear: both;'></div>\n          ";
  return buffer;}

function program81(depth0,data) {
  
  
  return "\n        <span class='note'>\n        Any key and secret will work for this app.\n        </span>\n      ";}

function program83(depth0,data) {
  
  
  return "\n        <span class='note'>This app requires a payment agreement with the vendor.</span>\n      ";}

function program85(depth0,data) {
  
  
  return "\n        <span class='note'>This app is currently in beta/alpha.</span>\n      ";}

function program87(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n        <span class='note'>Only works in ";
  foundHelper = helpers.only_works;
  stack1 = foundHelper || depth0.only_works;
  foundHelper = helpers.array_as_string;
  stack2 = foundHelper || depth0.array_as_string;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "array_as_string", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + ".</span>\n      ";
  return buffer;}

function program89(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n        <span class='note'>Not recommended in ";
  foundHelper = helpers.doesnt_work;
  stack1 = foundHelper || depth0.doesnt_work;
  foundHelper = helpers.array_as_string;
  stack2 = foundHelper || depth0.array_as_string;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "array_as_string", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + ".</span>\n      ";
  return buffer;}

function program91(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <span class='note'><a href=\"";
  foundHelper = helpers.support_link;
  stack1 = foundHelper || depth0.support_link;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "support_link", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" target=\"_blank\">Link to support for this app</a></span>\n      ";
  return buffer;}

function program93(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <span class='note'><a href=\"";
  foundHelper = helpers.ims_link;
  stack1 = foundHelper || depth0.ims_link;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "ims_link", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" target=\"_blank\">This app is IMS certified</a></span>\n      ";
  return buffer;}

function program95(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n        <br/>\n        <b>Related Apps:</b><br/>\n        ";
  foundHelper = helpers.related;
  stack1 = foundHelper || depth0.related;
  stack2 = helpers.each;
  tmp1 = self.program(96, program96, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  return buffer;}
function program96(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          <a class=\"related_app\" href=\"?tool=";
  foundHelper = helpers.tool_id;
  stack1 = foundHelper || depth0.tool_id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "tool_id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" title=\"";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"><img src=\"/tools/";
  foundHelper = helpers.tool_id;
  stack1 = foundHelper || depth0.tool_id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "tool_id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "/logo.png\"/></a>\n        ";
  return buffer;}

function program98(depth0,data) {
  
  
  return "\n        <!--\n        <br/><br/>\n        <a href=\"#\" id=\"report\">Report incompatibility</a>\n        <form>This app doesn't work in: <input type=\"text\"/><button type='submit'>Report</button></form>\n        -->\n      ";}

function program100(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n  <span class='span10 offset1'>\n    <a name=\"preview\"></a>\n    <span class='ratings' style=\"display: block;\">\n        ";
  foundHelper = helpers.avg_rating;
  stack1 = foundHelper || depth0.avg_rating;
  foundHelper = helpers.stars;
  stack2 = foundHelper || depth0.stars;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "stars", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + " ";
  foundHelper = helpers.ratings_count;
  stack1 = foundHelper || depth0.ratings_count;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "ratings_count", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n        ";
  foundHelper = helpers.comments_count;
  stack1 = foundHelper || depth0.comments_count;
  stack2 = helpers['if'];
  tmp1 = self.program(101, program101, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  foundHelper = helpers.user_key;
  stack1 = foundHelper || depth0.user_key;
  stack2 = helpers.unless;
  tmp1 = self.program(103, program103, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <form id='add_rating' style=\"display: none;\">\n            <input id=\"rating_star\" type=\"hidden\" name=\"rating\" value=\"\"/>\n            <textarea id=\"rating_comments\" placeholder=\"Type any additional comments here\" style=\"width: 300px; height: 50px;\"></textarea><br/>\n            <button type='submit' class='btn btn-primary'>Submit Comments</button>\n            <button type='button' class='bnt btn-cancel'>No Comment</button>\n        </form>\n        ";
  foundHelper = helpers.comments_count;
  stack1 = foundHelper || depth0.comments_count;
  stack2 = helpers['if'];
  tmp1 = self.program(105, program105, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </span>\n  </span>\n";
  return buffer;}
function program101(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img src='/comments.png'/> ";
  foundHelper = helpers.comments_count;
  stack1 = foundHelper || depth0.comments_count;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "comments_count", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n        ";
  return buffer;}

function program103(depth0,data) {
  
  
  return "\n        <div><a href='/login'><img src='/tools/twitter/icon.png'/> Login via Twitter</a> to rate and review this app</div>\n        ";}

function program105(depth0,data) {
  
  
  return "\n            <h3>Recent Comments</h3>\n            <span style=\"display: block;\" class='comments'>\n            </span>\n        ";}

  buffer += "<span class='span";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(6, program6, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " app ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(8, program8, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "'>\n    <span class='header' style=\"display: block;\">\n        <span class='icon' style=\"display: block;\">\n            <a href='?tool=";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'>\n                ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(10, program10, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(12, program12, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </a>\n        </span>\n        <h3>\n            <a href='?tool=";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "'>";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</a>\n        </h3>\n        <span style=\"display: block;\" class='author'>";
  foundHelper = helpers.author_name;
  stack1 = foundHelper || depth0.author_name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "author_name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</span>\n        <span class='rating' style=\"display: block;\">\n            ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(14, program14, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  foundHelper = helpers.show_votes;
  stack1 = foundHelper || depth0.show_votes;
  stack2 = helpers['if'];
  tmp1 = self.program(19, program19, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            <span style='clear: both;'></span>\n        </span>\n        <span class='description' style=\"display: block;\">\n            ";
  foundHelper = helpers.pending;
  stack1 = foundHelper || depth0.pending;
  stack2 = helpers['if'];
  tmp1 = self.program(22, program22, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  foundHelper = helpers['new'];
  stack1 = foundHelper || depth0['new'];
  stack2 = helpers['if'];
  tmp1 = self.program(24, program24, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  foundHelper = helpers.beta;
  stack1 = foundHelper || depth0.beta;
  stack2 = helpers['if'];
  tmp1 = self.program(26, program26, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  foundHelper = helpers.desc;
  stack1 = foundHelper || depth0.desc;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "desc", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n        </span>\n        ";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers.unless;
  tmp1 = self.program(28, program28, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </span>\n    ";
  foundHelper = helpers.config_details;
  stack1 = foundHelper || depth0.config_details;
  stack2 = helpers['if'];
  tmp1 = self.program(33, program33, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</span>\n";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(71, program71, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  foundHelper = helpers.single_tool;
  stack1 = foundHelper || depth0.single_tool;
  stack2 = helpers['if'];
  tmp1 = self.program(100, program100, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});
templates['tool_admin'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; partials = partials || Handlebars.partials;
  var buffer = "", stack1, stack2, stack3, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "/";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1);
  return buffer;}

function program3(depth0,data) {
  
  
  return "\n    <input type=\"hidden\" name=\"_method\" value=\"PUT\"/>\n  ";}

function program5(depth0,data) {
  
  
  return "\n      <legend>App Settings</legend>\n    ";}

function program7(depth0,data) {
  
  
  return "\n      <h2>Submitting an App</h2>\n      <p>If you've built an LTI App or are ready to submit your data collection to be processed into\n      an LTI app, please the use form below to provide us with the information we need to test and\n      then add your app to the directory.\n      </p>\n    ";}

function program9(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"uses\">Uses</label>\n        <div class=\"controls\">\n          <input type=\"text\" id=\"uses\" placeholder=\"###\" name=\"uses\" value=\"";
  foundHelper = helpers.uses;
  stack1 = foundHelper || depth0.uses;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "uses", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span2\"/>\n        </div>      \n      </div>\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"added\">Added</label>\n        <div class=\"controls\">\n          <input type=\"text\" id=\"added\" placeholder=\"iso8601 utc timestamp\" name=\"added\" value=\"";
  foundHelper = helpers.added;
  stack1 = foundHelper || depth0.added;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "added", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span2\"/>\n        </div>      \n      </div>\n      <div class=\"control-group\">\n        <div class=\"controls\">\n          <label>\n            <input type=\"checkbox\" name=\"pending\" value=\"1\" ";
  foundHelper = helpers.pending;
  stack1 = foundHelper || depth0.pending;
  stack2 = helpers['if'];
  tmp1 = self.program(10, program10, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\n            App Pending Review\n          </label>\n        </div>      \n      </div>\n    ";
  return buffer;}
function program10(depth0,data) {
  
  
  return "checked";}

function program12(depth0,data) {
  
  
  return "checked";}

function program14(depth0,data,depth1) {
  
  var buffer = "", stack1, stack2, stack3;
  buffer += "\n          <label class=\"checkbox\">\n            <input type=\"checkbox\" value=\"";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" name=\"categories[]\" ";
  stack1 = depth0;
  stack2 = {};
  foundHelper = helpers.categories;
  stack3 = foundHelper || depth1.categories;
  stack2['val'] = stack3;
  foundHelper = helpers.checked_if_included;
  stack3 = foundHelper || depth0.checked_if_included;
  tmp1 = {};
  tmp1.hash = stack2;
  if(typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else if(stack3=== undef) { stack1 = helperMissing.call(depth0, "checked_if_included", stack1, tmp1); }
  else { stack1 = stack3; }
  buffer += escapeExpression(stack1) + "/>\n            ";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n          </label>\n        ";
  return buffer;}

function program16(depth0,data,depth1) {
  
  var buffer = "", stack1, stack2, stack3;
  buffer += "\n          <label class=\"checkbox\">\n            <input type=\"checkbox\" value=\"";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" name=\"levels[]\" ";
  stack1 = depth0;
  stack2 = {};
  foundHelper = helpers.levels;
  stack3 = foundHelper || depth1.levels;
  stack2['val'] = stack3;
  foundHelper = helpers.checked_if_included;
  stack3 = foundHelper || depth0.checked_if_included;
  tmp1 = {};
  tmp1.hash = stack2;
  if(typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else if(stack3=== undef) { stack1 = helperMissing.call(depth0, "checked_if_included", stack1, tmp1); }
  else { stack1 = stack3; }
  buffer += escapeExpression(stack1) + "/>\n            ";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n          </label>\n        ";
  return buffer;}

function program18(depth0,data,depth1) {
  
  var buffer = "", stack1, stack2, stack3;
  buffer += "\n          <label class=\"checkbox\">\n            <input type=\"checkbox\" value=\"";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" name=\"extensions[]\" ";
  stack1 = depth0;
  stack2 = {};
  foundHelper = helpers.extensions;
  stack3 = foundHelper || depth1.extensions;
  stack2['val'] = stack3;
  foundHelper = helpers.checked_if_included;
  stack3 = foundHelper || depth0.checked_if_included;
  tmp1 = {};
  tmp1.hash = stack2;
  if(typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else if(stack3=== undef) { stack1 = helperMissing.call(depth0, "checked_if_included", stack1, tmp1); }
  else { stack1 = stack3; }
  buffer += escapeExpression(stack1) + "/>\n            ";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\n          </label>\n        ";
  return buffer;}

function program20(depth0,data) {
  
  
  return "selected";}

function program22(depth0,data) {
  
  var buffer = "", stack1, stack2, stack3;
  buffer += "\n          <option ";
  foundHelper = helpers.app_type;
  stack1 = foundHelper || depth0.app_type;
  stack2 = {};
  stack3 = "open_launch";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(23, program23, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " value=\"open_launch\">Open Access App</option>\n          ";
  return buffer;}
function program23(depth0,data) {
  
  
  return "selected";}

function program25(depth0,data) {
  
  
  return "selected";}

function program27(depth0,data) {
  
  
  return "checked";}

function program29(depth0,data) {
  
  
  return "selected";}

function program31(depth0,data) {
  
  
  return "selected";}

function program33(depth0,data) {
  
  
  return "selected";}

function program35(depth0,data) {
  
  
  return "selected";}

function program37(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n              ";
  stack1 = depth0;
  stack1 = self.invokePartial(partials.custom_field, 'custom_field', stack1, helpers, partials);;
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  return buffer;}

function program39(depth0,data) {
  
  
  return "style=\"display: none;\"";}

function program41(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                ";
  stack1 = depth0;
  stack1 = self.invokePartial(partials.config_option, 'config_option', stack1, helpers, partials);;
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n              ";
  return buffer;}

function program43(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n              ";
  stack1 = depth0;
  stack1 = self.invokePartial(partials.config_url, 'config_url', stack1, helpers, partials);;
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            ";
  return buffer;}

function program45(depth0,data) {
  
  
  return "checked";}

function program47(depth0,data) {
  
  
  return "checked";}

function program49(depth0,data) {
  
  
  return "Update";}

function program51(depth0,data) {
  
  
  return "Submit";}

  buffer += "<div class=\"span9 offset1\">\n<form class=\"form-horizontal\" action=\"/api/v1/apps";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  stack2 = helpers['if'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" method=\"POST\" id=\"app_settings\" style=\"height: auto;\">\n  ";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  stack2 = helpers['if'];
  tmp1 = self.program(3, program3, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  <fieldset>\n    ";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  stack2 = helpers['if'];
  tmp1 = self.program(5, program5, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(7, program7, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"name\">Name</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"name\" placeholder=\"App Name\" name=\"name\" value=\"";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"author_name\">Author</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"author_name\" placeholder=\"name or company\" name=\"author_name\" value=\"";
  foundHelper = helpers.author_name;
  stack1 = foundHelper || depth0.author_name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "author_name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"id\">ID</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"id\" placeholder=\"unique_tool_id\" name=\"id\" value=\"";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"description\">Description</label>\n      <div class=\"controls\">\n        <textarea name=\"description\" rows=\"4\" class=\"span6\" placeholder=\"100 words or less, go easy on the marketspeak or you'll be edited. Explain what your app does, and also what the LTI integration does.\">";
  foundHelper = helpers.description;
  stack1 = foundHelper || depth0.description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</textarea>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"short_description\">Short Description</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"short_description\" placeholder=\"optional\" name=\"short_description\" value=\"";
  foundHelper = helpers.short_description;
  stack1 = foundHelper || depth0.short_description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "short_description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    ";
  foundHelper = helpers.admin;
  stack1 = foundHelper || depth0.admin;
  stack2 = helpers['if'];
  tmp1 = self.program(9, program9, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <div class=\"control-group\">\n      <div class=\"controls\">\n        <label>\n          <input type=\"checkbox\" name=\"beta\" value=\"1\" ";
  foundHelper = helpers.beta;
  stack1 = foundHelper || depth0.beta;
  stack2 = helpers['if'];
  tmp1 = self.program(12, program12, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\n          This App is in Beta/Alpha\n        </label>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"logo_url\">Logo URL</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"logo_url\" placeholder=\"72x72 px long-term https (gif | png | jpg)\" name=\"logo_url\" value=\"";
  foundHelper = helpers.logo_url;
  stack1 = foundHelper || depth0.logo_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "logo_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"banner_url\">Banner URL</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"banner_url\" placeholder=\"240x125 px long-term https (gif | png | jpg)\" name=\"banner_url\" value=\"";
  foundHelper = helpers.banner_url;
  stack1 = foundHelper || depth0.banner_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "banner_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"icon_url\">Icon URL</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"icon_url\" placeholder=\"16x16 px long-term https (gif | png | jpg) (NO ICO)\" name=\"icon_url\" value=\"";
  foundHelper = helpers.icon_url;
  stack1 = foundHelper || depth0.icon_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "icon_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\">Categories</label>\n      <div class=\"controls\">\n        ";
  foundHelper = helpers.all_categories;
  stack1 = foundHelper || depth0.all_categories;
  stack2 = helpers.each;
  tmp1 = self.programWithDepth(program14, data, depth0);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\">Grade Levels</label>\n      <div class=\"controls\">\n        ";
  foundHelper = helpers.all_levels;
  stack1 = foundHelper || depth0.all_levels;
  stack2 = helpers.each;
  tmp1 = self.programWithDepth(program16, data, depth0);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"only_works\">Only Works In</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"only_works\" placeholder=\"list,of,platforms (blank if all)\" name=\"only_works\" value=\"";
  foundHelper = helpers.only_works;
  stack1 = foundHelper || depth0.only_works;
  foundHelper = helpers.array_as_string;
  stack2 = foundHelper || depth0.array_as_string;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "array_as_string", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n        <br/>\n        Comma-separated list of tags representing different products. <a href=\"#\" rel=\"/api/v1/app_platforms\" id=\"platforms\">See the current list of tags</a>.\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"doesnt_work\">Don't List In</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"doesnt_work\" placeholder=\"list,of,platforms (blank if none)\" name=\"doesnt_work\" value=\"";
  foundHelper = helpers.doesnt_work;
  stack1 = foundHelper || depth0.doesnt_work;
  foundHelper = helpers.array_as_string;
  stack2 = foundHelper || depth0.array_as_string;
  if(typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, { hash: {} }); }
  else if(stack2=== undef) { stack1 = helperMissing.call(depth0, "array_as_string", stack1, { hash: {} }); }
  else { stack1 = stack2; }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\" id=\"extensions\">\n      <label class=\"control-label\">Extensions Used</label>\n      <div class=\"controls\">\n        ";
  foundHelper = helpers.all_extensions;
  stack1 = foundHelper || depth0.all_extensions;
  stack2 = helpers.each;
  tmp1 = self.programWithDepth(program18, data, depth0);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"app_type\">Configuration Type</label>\n      <div class=\"controls\">\n        <select name=\"app_type\" id=\"app_type\">\n          <option value=\"by_hand\">Help Me Build My Configuration</option>\n          <option ";
  foundHelper = helpers.app_type;
  stack1 = foundHelper || depth0.app_type;
  stack2 = {};
  stack3 = "custom";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(20, program20, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " value=\"custom\">I already have an XML Config URL</option>\n          ";
  foundHelper = helpers.admin;
  stack1 = foundHelper || depth0.admin;
  stack2 = helpers['if'];
  tmp1 = self.program(22, program22, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          <option ";
  foundHelper = helpers.app_type;
  stack1 = foundHelper || depth0.app_type;
  stack2 = {};
  stack3 = "data";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(25, program25, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " value=\"data\">Data App</option>\n        </select>\n      </div>      \n    </div>\n    <div class=\"control-group app_type custom by_hand\">\n      <div class=\"controls\">\n        <label>\n          <input type=\"checkbox\" name=\"any_key\" value=\"1\" ";
  foundHelper = helpers.any_key;
  stack1 = foundHelper || depth0.any_key;
  stack2 = helpers['if'];
  tmp1 = self.program(27, program27, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\n          Any key and secret will work for this app\n        </label>\n      </div>      \n    </div>\n    <div class=\"control-group app_type custom\">\n      <label class=\"control-label\" for=\"config_url\">XML Configuration URL</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"config_url\" placeholder=\"https recommended\" name=\"config_url\" value=\"";
  foundHelper = helpers.config_url;
  stack1 = foundHelper || depth0.config_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "config_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n        <br/><a href=\"/build_xml.html\">try out the XML config builder</a>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand\">\n      <label class=\"control-label\" for=\"launch_url\">LTI Launch URL</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"launch_url\" placeholder=\"https recommended\" name=\"launch_url\" value=\"";
  foundHelper = helpers.launch_url;
  stack1 = foundHelper || depth0.launch_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "launch_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand\">\n      <label class=\"control-label\" for=\"domain\">Domain</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"domain\" placeholder=\"my.domain.com\" name=\"domain\" value=\"";
  foundHelper = helpers.domain;
  stack1 = foundHelper || depth0.domain;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "domain", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"privacy_level\">Launch Privacy</label>\n      <div class=\"controls\">\n        <select name=\"privacy_level\" id=\"privacy_level\">\n          <option ";
  foundHelper = helpers.privacy_level;
  stack1 = foundHelper || depth0.privacy_level;
  stack2 = {};
  stack3 = "anonymous";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(29, program29, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " value=\"anonymous\">Anonymous</option>\n          <option ";
  foundHelper = helpers.privacy_level;
  stack1 = foundHelper || depth0.privacy_level;
  stack2 = {};
  stack3 = "name_only";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(31, program31, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " value=\"name_only\">Name Only</option>\n          <option ";
  foundHelper = helpers.privacy_level;
  stack1 = foundHelper || depth0.privacy_level;
  stack2 = {};
  stack3 = "email_only";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(33, program33, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " value=\"email_only\">Email Only</option>\n          <option ";
  foundHelper = helpers.privacy_level;
  stack1 = foundHelper || depth0.privacy_level;
  stack2 = {};
  stack3 = "public";
  stack2['val'] = stack3;
  foundHelper = helpers.if_eql;
  stack3 = foundHelper || depth0.if_eql;
  tmp1 = self.program(35, program35, data);
  tmp1.hash = stack2;
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack3 === functionType) { stack1 = stack3.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack3, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " value=\"public\">Public</option>\n        </select>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand open_launch dialog\">\n      <label class=\"control-label\" for=\"width\">Dialog Width</label>\n      <div class=\"controls\">\n        <div class=\"input-append\">\n          <input type=\"text\" id=\"width\" class=\"span1\" name=\"width\" value=\"";
  foundHelper = helpers.width;
  stack1 = foundHelper || depth0.width;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "width", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n          <span class=\"add-on\">px</span>\n        </div>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand open_launch dialog\">\n      <label class=\"control-label\" for=\"height\">Dialog Height</label>\n      <div class=\"controls\">\n        <div class=\"input-append\">\n          <input type=\"text\" id=\"height\" class=\"span1\" name=\"height\" value=\"";
  foundHelper = helpers.height;
  stack1 = foundHelper || depth0.height;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "height", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n          <span class=\"add-on\">px</span>\n        </div>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand\" id=\"custom_fields\">\n      <label class=\"control-label\">Custom Fields</label>\n      <div class=\"controls\">\n        <div class=\"input-append\">\n          <div class=\"fields\">\n            ";
  foundHelper = helpers.custom_fields;
  stack1 = foundHelper || depth0.custom_fields;
  foundHelper = helpers.each_in_hash;
  stack2 = foundHelper || depth0.each_in_hash;
  tmp1 = self.program(37, program37, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  if(foundHelper && typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, tmp1); }
  else { stack1 = blockHelperMissing.call(depth0, stack2, stack1, tmp1); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          </div>\n          <button type='button' class=\"btn add_field\">Add Field</button>\n        </div>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand custom open_launch\" id=\"config_options\">\n      <label class=\"control-label\">XML Config Parameters\n        <div><a href=\"/xml_config_params.html\" target=\"_blank\">What is this?</a></div>\n      </label>\n      <div class=\"controls\">\n        <div class=\"input-append\">\n          <table ";
  foundHelper = helpers.config_options;
  stack1 = foundHelper || depth0.config_options;
  stack2 = helpers.unless;
  tmp1 = self.program(39, program39, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">\n            <thead>\n              <tr>\n                <td>Name</td>\n                <td>Prompt</td>\n                <td>Req'd</td>\n                <td>Type</td>\n                <td>Value</td>\n                <td>&nbsp;</td>\n              </tr>\n            </thead>\n            <tbody class=\"fields\">\n              ";
  foundHelper = helpers.config_options;
  stack1 = foundHelper || depth0.config_options;
  stack2 = helpers.each;
  tmp1 = self.program(41, program41, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </tbody>\n          </table>\n          <button type='button' class=\"btn add_field\">Add Field</button>\n        </div>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand custom\" id=\"config_urls\">\n      <label class=\"control-label\">Multiple Config URLs</label>\n      <div class=\"controls\">\n        <div class=\"input-append\">\n          <div class=\"fields\">\n            ";
  foundHelper = helpers.config_urls;
  stack1 = foundHelper || depth0.config_urls;
  stack2 = helpers.each;
  tmp1 = self.program(43, program43, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          </div>\n          <button type='button' class=\"btn add_field\">Add Field</button>\n        </div>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand open_launch config_options\">\n      <label class=\"control-label\" for=\"variable_name\">Variable Name</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"variable_name\" placeholder=\"substitute config parameters\" name=\"variable_name\" value=\"";
  foundHelper = helpers.variable_name;
  stack1 = foundHelper || depth0.variable_name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "variable_name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand open_launch config_options\">\n      <label class=\"control-label\" for=\"variable_description\">Variable Description</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"variable_description\" placeholder=\"substitute config parameters\" name=\"variable_description\" value=\"";
  foundHelper = helpers.variable_description;
  stack1 = foundHelper || depth0.variable_description;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "variable_description", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand course_nav\">\n      <label class=\"control-label\" for=\"course_nav_link_text\">Course Nav Link Text</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"course_nav_link_text\" placeholder=\"blank to use app name\" name=\"course_nav_link_text\" value=\"";
  foundHelper = helpers.course_nav_link_text;
  stack1 = foundHelper || depth0.course_nav_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "course_nav_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand account_nav\">\n      <label class=\"control-label\" for=\"account_nav_link_text\">Account Nav Link Text</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"account_nav_link_text\" placeholder=\"blank to use app name\" name=\"account_nav_link_text\" value=\"";
  foundHelper = helpers.account_nav_link_text;
  stack1 = foundHelper || depth0.account_nav_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "account_nav_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand user_nav\">\n      <label class=\"control-label\" for=\"user_nav_link_text\">User Nav Link Text</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"user_nav_link_text\" placeholder=\"blank to use app name\" name=\"user_nav_link_text\" value=\"";
  foundHelper = helpers.user_nav_link_text;
  stack1 = foundHelper || depth0.user_nav_link_text;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user_nav_link_text", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n      </div>      \n    </div>\n    <div class=\"control-group app_type data\">\n      <label class=\"control-label\" for=\"data_url\">Data Source URL</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"data_url\" placeholder=\"must return CORS json result\" name=\"data_url\" value=\"";
  foundHelper = helpers.data_url;
  stack1 = foundHelper || depth0.data_url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "data_url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n        &nbsp;&nbsp;\n        <a href=\"/build_json.html\" target=\"_blank\">what's a Data App?</a>\n      </div>      \n    </div>\n    <div class=\"control-group app_type data\">\n      <label class=\"control-label\" for=\"description\">Data App JSON</label>\n      <div class=\"controls\">\n        <textarea name=\"data_json\" rows=\"4\" class=\"span6\" placeholder=\"not required if Data Source URL provided. If more than 500 records use data URL\">";
  foundHelper = helpers.data_json;
  stack1 = foundHelper || depth0.data_json;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "data_json", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</textarea>\n      </div>      \n    </div>\n    <div class=\"control-group app_type open_launch data\">\n      <div class=\"controls\">\n        <label>\n          <input type=\"checkbox\" name=\"exclude_from_public_collections\" value=\"1\" ";
  foundHelper = helpers.exclude_from_public_collections;
  stack1 = foundHelper || depth0.exclude_from_public_collections;
  stack2 = helpers['if'];
  tmp1 = self.program(45, program45, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />        \n          Exclude from Public Collections App\n        <label>\n      </div>      \n    </div>\n    <div class=\"control-group app_type open_launch\">\n      <div class=\"controls\">\n        <label>\n          <input type=\"checkbox\" name=\"no_launch\" value=\"1\" ";
  foundHelper = helpers.no_launch;
  stack1 = foundHelper || depth0.no_launch;
  stack2 = helpers['if'];
  tmp1 = self.program(47, program47, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "/>        \n          App can only be launched from selection dialogs (not standard LTI)\n        <label>\n      </div>      \n    </div>\n    <div class=\"control-group app_type open_launch by_hand custom\">\n      <label class=\"control-label\" for=\"preview_url\">Preview URL</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"preview_url\" placeholder=\"youtube/vimeo or other iframe URL showing your app\" name=\"preview[url]\" value=\"";
  foundHelper = helpers.preview;
  stack1 = foundHelper || depth0.preview;
  stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.url);
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "preview.url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    <div class=\"control-group app_type open_launch by_hand custom preview\">\n      <label class=\"control-label\" for=\"preview_height\">Preview Height</label>\n      <div class=\"controls\">\n        <div class=\"input-append\">\n          <input type=\"text\" id=\"preview_height\" class=\"span1\" name=\"preview[height]\" value=\"";
  foundHelper = helpers.preview;
  stack1 = foundHelper || depth0.preview;
  stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.height);
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "preview.height", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\"/>\n          <span class=\"add-on\">px</span>\n        </div>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"support_link\">Support Link/Email</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"support_link\" placeholder=\"http or mailto\" name=\"support_link\" value=\"";
  foundHelper = helpers.support_link;
  stack1 = foundHelper || depth0.support_link;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "support_link", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <label class=\"control-label\" for=\"ims_link\">IMS Certification URL</label>\n      <div class=\"controls\">\n        <input type=\"text\" id=\"ims_link\" placeholder=\"strongly recommended\" name=\"ims_link\" value=\"";
  foundHelper = helpers.ims_link;
  stack1 = foundHelper || depth0.ims_link;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "ims_link", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"span6\"/>\n        <br/><a href=\"http://www.imsglobal.org/cc/alltools.cfm\">paste the link listed here</a>\n      </div>      \n    </div>\n    <div class=\"control-group app_type by_hand custom\">\n      <label class=\"control-label\" for=\"test_instructions\">Testing Instructions</label>\n      <div class=\"controls\">\n        <textarea id=\"test_instructions\" name=\"test_instructions\" rows=\"4\" class=\"span6\">";
  foundHelper = helpers.test_instructions;
  stack1 = foundHelper || depth0.test_instructions;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "test_instructions", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</textarea><br/>\n        Please provide directions on how we can test the app, including any\n        keys, secrets, and test-specific URLs needed for the test environment.\n      </div>      \n    </div>\n    <div class=\"control-group\">\n      <div class=\"controls\">\n        <button class='btn btn-primary' type=\"submit\">";
  foundHelper = helpers.id;
  stack1 = foundHelper || depth0.id;
  stack2 = helpers['if'];
  tmp1 = self.program(49, program49, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(51, program51, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " App</button>\n      </div>\n    </div>\n  </fieldset>\n</form>\n</div>";
  return buffer;});
templates['tool_preview'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n        <iframe src=\"";
  foundHelper = helpers.url;
  stack1 = foundHelper || depth0.url;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "url", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" frameborder=\"0\" style=\"background: #fff; border: 1px solid #ccc; height: ";
  foundHelper = helpers.height;
  stack1 = foundHelper || depth0.height;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "height", { hash: {} }); }
  buffer += escapeExpression(stack1) + "px; width: ";
  foundHelper = helpers.width;
  stack1 = foundHelper || depth0.width;
  stack2 = helpers['if'];
  tmp1 = self.program(2, program2, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.program(4, program4, data);
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ";\"/>\n    ";
  return buffer;}
function program2(depth0,data) {
  
  var buffer = "", stack1;
  foundHelper = helpers.width;
  stack1 = foundHelper || depth0.width;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "width", { hash: {} }); }
  buffer += escapeExpression(stack1) + "px";
  return buffer;}

function program4(depth0,data) {
  
  
  return "100%";}

  buffer += "<div class='preview_pane well'>\n    <h2>Tool Preview:</h2>\n    ";
  foundHelper = helpers.preview;
  stack1 = foundHelper || depth0.preview;
  stack2 = helpers['with'];
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>";
  return buffer;});
templates['tools_header'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <option value=\"";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\">";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</option>\n        ";
  return buffer;}

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <option value=\"";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\">";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</option>\n        ";
  return buffer;}

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <option value=\"";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\">";
  stack1 = depth0;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</option>\n        ";
  return buffer;}

  buffer += "<div class=\"filters form-inline well\">\n    <select id=\"category\" title=\"Category\">\n        <option value=\"all\">All Categories</option>\n        <option value=\"recent\">Recently Added</option>\n        ";
  foundHelper = helpers.categories;
  stack1 = foundHelper || depth0.categories;
  stack2 = helpers.each;
  tmp1 = self.program(1, program1, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </select>\n    \n    <select id=\"level\" title=\"Grade Level\">\n        <option value=\"all\">All Grade Levels</option>\n        ";
  foundHelper = helpers.levels;
  stack1 = foundHelper || depth0.levels;
  stack2 = helpers.each;
  tmp1 = self.program(3, program3, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </select>\n    \n    <select id=\"platform\" title=\"Platform\">\n        <option value=\"all\">All Platforms</option>\n        ";
  foundHelper = helpers.platforms;
  stack1 = foundHelper || depth0.platforms;
  stack2 = helpers.each;
  tmp1 = self.program(5, program5, data);
  tmp1.hash = {};
  tmp1.fn = tmp1;
  tmp1.inverse = self.noop;
  stack1 = stack2.call(depth0, stack1, tmp1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <option value=\"other\">Other Platform</option>\n    </select>\n    <span id=\"visible_app_count\"></span>&nbsp;\n    Apps Shown\n</div>";
  return buffer;});
})();
