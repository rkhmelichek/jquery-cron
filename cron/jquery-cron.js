/*
 * jQuery gentleSelect plugin
 * http://github.com/rkhmelichek/jquery-cron
 *
 * Copyright (c) 2010 Shawn Chin.
 * Copyright (c) 2013 Roman Khmelichek.
 *
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Usage:
 * (JS)
 *   // initialise like this
 *   var c = $('#cron').cron({
 *     initial: '9 10 * * *', # Initial value. default = "* * * * *"
 *     url_set: '/set/', # POST expecting {"cron": "12 10 * * 6"}
 *   });
 *
 *   // you can update values later 
 *   c.cron("value", "1 2 3 4 *");
 *
 *   // you can also get the current value using the "value" option
 *   alert(c.cron("value"));
 *
 * (HTML)
 *   <div id='cron'></div>
 *
 * Notes:
 * We only support a subset of possible cron options.
 * For example, each cron field can only be digits (including multiple comma separated values)
 * or "*", to denote every possible value. We also limit the allowed combinations to:
 *
 * - Every minute : * * * * *
 * - Every hour   : ? * * * *
 * - Every day    : ? ? * * *
 * - Every week   : ? ? * * ?
 * - Every month  : ? ? ? * *
 * - Every year   : ? ? ? ? *
 */
(function($) {
    // Used to expose internal functions to our test suite.
    var test = {};

    var defaults = {
        initial : "* * * * *",
        minuteOpts : {
            minWidth  : 100,  // Only applies if columns and itemWidth not set.
            itemWidth : 30,
            columns   : 4,
            rows      : undefined,
            title     : "Minutes Past the Hour"
        },
        timeHourOpts : {
            minWidth  : 100, // Only applies if columns and itemWidth not set.
            itemWidth : 20,
            columns   : 2,
            rows      : undefined,
            title     : "Time: Hour"
        },
        domOpts : {
            minWidth  : 100, // Only applies if columns and itemWidth not set.
            itemWidth : 30,
            columns   : undefined,
            rows      : 10,
            title     : "Day of Month"
        },
        monthOpts : {
            minWidth  : 100, // Only applies if columns and itemWidth not set.
            itemWidth : 100,
            columns   : 2,
            rows      : undefined,
            title     : undefined
        },
        dowOpts : {
            minWidth  : 100, // Only applies if columns and itemWidth not set.
            itemWidth : undefined,
            columns   : undefined,
            rows      : undefined,
            title     : undefined
        },
        timeMinuteOpts : {
            minWidth  : 100,  // Only applies if columns and itemWidth not set.
            itemWidth : 20,
            columns   : 4,
            rows      : undefined,
            title     : "Time: Minute"
        },
        effectOpts : {
            openSpeed      : 400,
            closeSpeed     : 400,
            openEffect     : "slide",
            closeEffect    : "slide",
            hideOnMouseOut : true
        },
        url_set : undefined,
        customValues : undefined,
        onChange: undefined
    };

    // Options for minutes in an hour.
    var str_opt_mih = "";
    for (var i = 0; i < 60; i++) {
        var j = (i < 10)? "0":"";
        str_opt_mih += "<option value='"+i+"'>" + j +  i + "</option>\n"; 
    }

    // Options for hours in a day,
    var str_opt_hid = "";
    for (var i = 0; i < 24; i++) { 
        var j = (i < 10)? "0":"";
        str_opt_hid += "<option value='"+i+"'>" + j + i + "</option>\n"; 
    }

    // Options for days of month.
    var str_opt_dom = "";
    for (var i = 1; i < 32; i++) {
        if (i == 1 || i == 21 || i == 31) { var suffix = "st"; } 
        else if (i == 2 || i == 22) { var suffix = "nd"; } 
        else if (i == 3 || i == 23) { var suffix = "rd"; } 
        else { var suffix = "th"; }
        str_opt_dom += "<option value='"+i+"'>" + i + suffix + "</option>\n"; 
    }

    // Options for months.
    var str_opt_month = "";
    var months = ["January", "February", "March", "April",
                  "May", "June", "July", "August",
                  "September", "October", "November", "December"];
    for (var i = 0; i < months.length; i++) {
        str_opt_month += "<option value='"+(i+1)+"'>" + months[i] + "</option>\n"; 
    }

    // Options for day of week.
    var str_opt_dow = "";
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
                "Friday", "Saturday"];
    for (var i = 0; i < days.length; i++) {
        str_opt_dow += "<option value='"+i+"'>" + days[i] + "</option>\n"; 
    }

    // Options for period.
    var str_opt_period = "";
    var periods = ["minute", "hour", "day", "week", "month", "year"];
    for (var i = 0; i < periods.length; i++) {
        str_opt_period += "<option value='"+periods[i]+"'>" + periods[i] + "</option>\n"; 
    }

    // Display matrix.
    var toDisplay = {
        "minute" : [],
        "hour"   : ["mins"],
        "day"    : ["time-hrs", "time-mins"],
        "week"   : ["dow", "time-hrs", "time-mins"],
        "month"  : ["dom", "time-hrs", "time-mins"],
        "year"   : ["dom", "month", "time-hrs", "time-mins"]
    };

    // Matches a cron field.
    var cron_field = "(((\\d{1,2},)*\\d{1,2})|\\*)";

    // Matches a cron field, but does not match "*".
    var cron_field_must = "((\\d{1,2},)*\\d{1,2})";

    // Acceptable cron formats we support.
    var combinations = {
        // "* * * * *"
        "minute" : new RegExp("^(\\*\\s){4}\\*$"),

        // "? * * * *"
        "hour"   : new RegExp("^" + cron_field_must + "\\s(\\*\\s){3}\\*$"),

        // "? ? * * *"
        "day"    : new RegExp("^(" + cron_field_must + "\\s){2}(\\*\\s){2}\\*$"),

        // "? ? * * ?"
        "week"   : new RegExp("^(" + cron_field_must + "\\s){2}(\\*\\s){2}" + cron_field_must + "$"),

        // "? ? ? * *"
        "month"  : new RegExp("^(" + cron_field_must + "\\s){3}\\*\\s\\*$"),

        // "? ? ? ? *"
        "year"   : new RegExp("^(" + cron_field_must + "\\s){4}\\*$")
    };

    /**
     * Internal Functions
     */

    function defined(obj) {
        if (typeof obj == "undefined") { return false; }
        else { return true; }
    }

    function undefinedOrObject(obj) {
        return (!defined(obj) || typeof obj == "object")
    }
 
    function getCronType(cron_str) {
        // Check format of initial cron value.
        var valid_cron = new RegExp("^(" + cron_field + "\\s){4}" + cron_field + "$");
        if (typeof cron_str != "string" || !valid_cron.test(cron_str)) {
            $.error("cron: invalid initial value");
            return undefined;
        }

        // Check actual cron values.
        var d = cron_str.split(" ");
        //            mm, hh, DD, MM, DOW
        var minval = [ 0,  0,  1,  1,  0];
        var maxval = [59, 23, 31, 12,  6];
        for (var i = 0; i < d.length; i++) {
            if (d[i] == "*")
                continue;

            var v = parseInt(d[i]);
            if (defined(v) && v <= maxval[i] && v >= minval[i])
                continue;

            $.error("cron: invalid value found (col "+(i+1)+") in " + cron_str);
            return undefined;
        }

        // Determine combination.
        for (var t in combinations) {
            if (combinations[t].test(cron_str)) {
                return t;
            }
        }

        // Unknown combination.
        $.error("cron: valid but unsupported cron format");
        return undefined;
    }
    test.getCronType = getCronType;

    function hasError(c, o) {
        if (!defined(getCronType(o.initial))) { return true; }
        if (!undefinedOrObject(o.customValues)) { return true; }
        return false;
    }

    function getCurrentValue(c) {
        var block = c.data("block");
        var min = hour = day = month = dow = "*";
        var selectedPeriod = block["period"].find("select").val();
        switch (selectedPeriod) {
            case "minute":
                break;

            case "hour":
                min = block["mins"].find("select").val();
                break;

            case "day":
                min  = block["time-mins"].find("select").val();
                hour = block["time-hrs"].find("select").val();
                break;

            case "week":
                min  = block["time-mins"].find("select").val();
                hour = block["time-hrs"].find("select").val();
                dow  =  block["dow"].find("select").val();
                break;

            case "month":
                min  = block["time-mins"].find("select").val();
                hour = block["time-hrs"].find("select").val();
                day  = block["dom"].find("select").val();
                break;

            case "year":
                min  = block["time-mins"].find("select").val();
                hour = block["time-hrs"].find("select").val();
                day  = block["dom"].find("select").val();
                month = block["month"].find("select").val();
                break;

            default:
                // Assume this only happens when customValues is set.
                return selectedPeriod;
        }

        return [min, hour, day, month, dow].join(" ");
    }

    /**
     * Public Methods
     */

    var methods = {
        init : function(opts) {
            // Init options.
            var options = opts ? opts : {};  // Default to empty obj.
            var o = $.extend([], defaults, options);
            var eo = $.extend({}, defaults.effectOpts, options.effectOpts);
            $.extend(o, {
                minuteOpts     : $.extend({}, defaults.minuteOpts, eo, options.minuteOpts), 
                domOpts        : $.extend({}, defaults.domOpts, eo, options.domOpts), 
                monthOpts      : $.extend({}, defaults.monthOpts, eo, options.monthOpts), 
                dowOpts        : $.extend({}, defaults.dowOpts, eo, options.dowOpts), 
                timeHourOpts   : $.extend({}, defaults.timeHourOpts, eo, options.timeHourOpts), 
                timeMinuteOpts : $.extend({}, defaults.timeMinuteOpts, eo, options.timeMinuteOpts)
            });

            // Prepend custom values if specified.
            var custom_periods = "";
            if (defined(o.customValues)) {
                for (var key in o.customValues) {
                    custom_periods += "<option value='" + o.customValues[key] + "'>" + key + "</option>";
                }
            }

            // Error checking.
            if (hasError(this, o)) {
                return this;
            }

            var blockBefore = [];
            var blockAfter = [];
            var block = [];

            // We use a table in order to vertically center all our elements.
            // This seems to be the simplest method and works across all browsers.
            var $tr = $("<table><tr></tr></table>").appendTo(this).find("tr");

            // Period.
            $tr.append(blockBefore["period"] = $("<td class='cron-period'>Every </td>"));
            var $periodBlock = block["period"] = $(
                      "<td class='cron-period'>"
                    + "<select name='cron-period'>"
                    + custom_periods
                    + str_opt_period
                    + "</select>"
                    + "</td>");
            $periodBlock.appendTo($tr);
            var $periodSelectEl = $periodBlock.find("select");
            $periodSelectEl.bind("change.cron", event_handlers.periodChanged);
            $periodSelectEl.data("root", this);
            $periodSelectEl.gentleSelect(eo);

            // Days of month.
            $tr.append(blockBefore["dom"] = $("<td class='cron-block cron-block-dom'>on the: </td>"));
            var $domBlock = block["dom"] = $(
                      "<td class='cron-block cron-block-dom'>"
                    + "<select name='cron-dom' multiple='multiple'>"
                    + str_opt_dom 
                    + "</select>"
                    + "</td>");
            $domBlock.appendTo($tr);
            $domBlock.data("root", this);
            $domBlock.find("select").gentleSelect(o.domOpts).data("root", this);

            // Months.
            $tr.append(blockBefore["month"] = $("<td class='cron-block cron-block-month'>of: </td>"));
            var $monthBlock = block["month"] = $(
                      "<td class='cron-block cron-block-month'>"
                    + "<select name='cron-month' multiple='multiple'>"
                    + str_opt_month 
                    + "</select>"
                    + "</td>");
            $monthBlock.appendTo($tr);
            $monthBlock.data("root", this);
            $monthBlock.find("select").gentleSelect(o.monthOpts).data("root", this);

            // Minutes.
            $tr.append(blockBefore["mins"] = $("<td class='cron-block cron-block-mins'>at </td>"));
            var $minsBlock = block["mins"] = $(
                      "<span class='cron-block cron-block-mins'>"
                    + "<select name='cron-mins' multiple='multiple'>"
                    + str_opt_mih 
                    + "</select>"
                    + "</span>");
            $minsBlock.appendTo($tr);
            $minsBlock.data("root", this);
            $minsBlock.find("select").gentleSelect(o.minuteOpts).data("root", this);
            $tr.append(blockAfter["mins"] = $("<td class='cron-block cron-block-mins'> minutes past the hour</td>"));

            // Days of week.
            $tr.append(blockBefore["dow"] = $("<td class='cron-block cron-block-dow'>on: </td>"));
            var $dowBlock = block["dow"] = $(
                      "<td class='cron-block cron-block-dow'>"
                    + "<select name='cron-dow' multiple='multiple'>"
                    + str_opt_dow
                    + "</select>"
                    + "</td>");
            $dowBlock.appendTo($tr);
            $dowBlock.data("root", this);
            $dowBlock.find("select").gentleSelect(o.dowOpts).data("root", this);

            // Hour of the day.
            $tr.append(blockBefore["time-hrs"] = $("<td class='cron-block cron-time-hour'>at </td>"));
            var $timeHrsBlock = block["time-hrs"] = $(
                      "<td class='cron-block cron-time-hour'>"
                    + "<select name='cron-time-hour' multiple='multiple'>"
                    + str_opt_hid
                    + "</select>"
                    + "</td>");
            $timeHrsBlock.appendTo($tr);
            $timeHrsBlock.data("root", this);
            $timeHrsBlock.find("select").gentleSelect(o.timeHourOpts).data("root", this);

            // Minute of the hour.
            $tr.append(blockBefore["time-mins"] = $("<td class='cron-block cron-time-min'>: </td>"));
            var $timeMinsBlock = block["time-mins"] = $(
                      "<td class='cron-block cron-time-min'>"
                    + "<select name='cron-time-min' multiple='multiple'>"
                    + str_opt_mih
                    + "</select>"
                    + "</td>");
            $timeMinsBlock.appendTo($tr);
            $timeMinsBlock.data("root", this);
            $timeMinsBlock.find("select").gentleSelect(o.timeMinuteOpts).data("root", this);

            this.find("select").bind("change.cron-callback", event_handlers.somethingChanged);
            this.data("options", o);
            this.data("block", block);
            this.data("blockBefore", blockBefore);
            this.data("blockAfter", blockAfter);
            this.data("current_value", o.initial);  // Remember base value to detect changes.

            return methods["value"].call(this, o.initial);  // Set initial value.
        },

        value : function(cron_str) {
            // When no args, act as getter.
            if (!cron_str) { return getCurrentValue(this); }

            var t = getCronType(cron_str);
            if (!defined(t)) { return false; }

            var block = this.data("block");
            var d = cron_str.split(" ");
            var v = {
                "mins"  : d[0],
                "hour"  : d[1],
                "dom"   : d[2],
                "month" : d[3],
                "dow"   : d[4]
            };

            // Update appropriate select boxes.
            var targets = toDisplay[t];
            for (var i = 0; i < targets.length; i++) {
                var tgt = targets[i];

                if (tgt == "time-mins") {
                  var minsArr = v["mins"].split(",");

                  for (var j = 0; j < minsArr.length; j++) {
                    var mins = minsArr[j];

                    // TODO: Need a match so that 0 will match 00, etc
                    // contains might not be strict enough.
                    console.log("MINS IS " + mins);
                    var $optionEl = block[tgt].find("option:contains('" + mins + "')").first();
                    console.log($optionEl);
                    if ($optionEl.length)
                      $optionEl[0].selected = true;
 
                    block[tgt].find("select").gentleSelect("update");
                  }
                } else if (tgt == "time-hrs") {
                    block[tgt]
                        .find("select")
                            .val(v["hour"]).gentleSelect("update");
                } else {
                    block[tgt].find("select").val(v[tgt]).gentleSelect("update");
                }
            }

            // Trigger change event.
            block["period"].find("select")
                .val(t)
                .gentleSelect("update")
                .trigger("change");

            return this;
        }
    };

    var event_handlers = {
        periodChanged : function() {
            var root = $(this).data("root");
            var blockBefore = root.data("blockBefore");
            var blockAfter = root.data("blockAfter");
            var block = root.data("block");
            var opt = root.data("options");
            var period = $(this).val();
            root.find(".cron-block").hide();  // First, hide all blocks.
            if (toDisplay.hasOwnProperty(period)) {
                // Only if not a custom value.
                var b = toDisplay[$(this).val()];
                for (var i = 0; i < b.length; i++) {
                    var type = b[i];

                    var $blockBeforeEl = blockBefore[type];
                    if ($blockBeforeEl)
                      $blockBeforeEl.show();

                    block[type].show();

                    var $blockAfterEl = blockAfter[type];
                    if ($blockAfterEl)
                      $blockAfterEl.show();
                }
            }
        },

        somethingChanged : function() {
            var root = $(this).data("root");

            // Chain in user defined event handler, if specified.
            var oc = root.data("options").onChange;
            if (defined(oc) && $.isFunction(oc)) {
                oc.call(root);
            }
        }
    };

    $.fn.cron = function(method) {
        if (method === "test") {
          // Return an object that exposes internal functions for unit testing.
          return test;
        }

        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.cron' );
        }
    };
})(jQuery);
