/*
 * jQuery gentleSelect plugin
 *
 * Copyright (c) 2010 Shawn Chin.
 * Copyright (c) 2013 Roman Khmelichek.
 *
 * Licensed under the MIT license.
 * 
 * Usage:
 *  (JS)
 *
 *   $('#myselect').gentleSelect(); // default. single column
 *
 *   $('#myselect').gentleSelect({ // 3 columns, 150px wide each
 *     itemWidth : 150,
 *     columns   : 3,
 *   });
 *
 * (HTML)
 *   <select id='myselect'><options> ... </options></select>
 */
(function($) {
    
    var defaults = {
        minWidth  : 100,  // Only applies if columns and itemWidth not set.
        itemWidth : undefined,
        columns   : undefined,
        rows      : undefined,
        title     : undefined,
        prompt    : "Make A Selection",
        maxDisplay: 0,  // Set to 0 for unlimited.
        openSpeed       : 400,
        closeSpeed      : 400,
        openEffect      : "slide",
        closeEffect     : "slide",
        hideOnMouseOut  : true
    }

    function defined(obj) {
        if (typeof obj == "undefined") { return false; }
        else { return true; }
    }

    function hasError(c, o) {
        if (defined(o.columns) && defined(o.rows)) {
            $.error("gentleSelect: you cannot supply both 'rows' and 'columns'");
            return true;
        }
        if (defined(o.columns) && !defined(o.itemWidth)) {
            $.error("gentleSelect: 'itemWidth' must be supplied if 'columns' is specified");
            return true;
        }
        if (defined(o.rows) && !defined(o.itemWidth)) {
            $.error("gentleSelect: 'itemWidth' must be supplied if 'rows' is specified");
            return true;
        }
        if (!defined(o.openSpeed) || typeof o.openSpeed != "number" && 
                (typeof o.openSpeed == "string" && (o.openSpeed != "slow" && o.openSpeed != "fast"))) { 
            $.error("gentleSelect: 'openSpeed' must be an integer or \"slow\" or \"fast\"");
            return true;
        }
        if (!defined(o.closeSpeed) || typeof o.closeSpeed != "number" && 
                (typeof o.closeSpeed == "string" && (o.closeSpeed != "slow" && o.closeSpeed != "fast"))) { 
            $.error("gentleSelect: 'closeSpeed' must be an integer or \"slow\" or \"fast\"");
            return true;
        }
        if (!defined(o.openEffect) || (o.openEffect != "fade" && o.openEffect != "slide")) {
            $.error("gentleSelect: 'openEffect' must be either \"fade\" or \"slide\"");
            return true;
        }
        if (!defined(o.closeEffect)|| (o.closeEffect != "fade" && o.closeEffect != "slide")) {
            $.error("gentleSelect: 'closeEffect' must be either \"fade\" or \"slide\"");
            return true;
        }
        if (!defined(o.hideOnMouseOut) || (typeof o.hideOnMouseOut != "boolean")) {
            $.error("gentleSelect: 'hideOnMouseOut' must be supplied and either \"true\" or \"false\"");
            return true;
        }
        return false;
    }

    function getSelectedAsText(all, elemList, opts) {
        // If no items selected, return prompt.
        if (elemList.length < 1) {
            return opts.prompt;
        }

        var isTruncated;
        if (opts.maxDisplay != 0 && elemList.length > opts.maxDisplay) {
            // Truncate if exceeding maxDisplay.
            var arr = $.map(elemList.slice(0, opts.maxDisplay), function(el, i) {
                return $(el).text();
            });
            isTruncated = true;
        } else {
            var arr = $.map(elemList, function(el, i) {
                return $(el).text();
            });
            isTruncated = false;
        }

        // Determine if the list contains strings or numbers.
        var isAllNumeric = true;
        var startsWithNumberRegex = /^[0-9]+/;
        for (var i = 0; i < arr.length; i++) {
          if (!startsWithNumberRegex.test(arr[i])) {
            isAllNumeric = false;
            break;
          }
        }

        // TODO: After you pick an option, close the dropdown, and animate the new item being added.
        var cmp;
        if (isAllNumeric) {
          // Numeric comparison function.
          cmp = function(a, b) {
            var aMatch = startsWithNumberRegex.exec(a);
            var bMatch = startsWithNumberRegex.exec(b);

            if (aMatch != null) a = aMatch[0];
            if (bMatch != null) b = bMatch[0];

            return a - b;
          };
        } else {
          // Compare by the order defined in the select element.
          cmp = function(a, b) {
            var aOption = all.find("option:contains('" + a + "')").first();
            var bOption = all.find("option:contains('" + b + "')").first();

            // TODO: Check for null?
            return aOption.attr("value") > bOption.attr("value");
          }
        }

        arr.sort(cmp);
        if (isTruncated) {
          arr.push("...");
        }

        // TODO: Make all these individual div elements.
        return arr.join("<br/>");
    }

    var methods = {
        init : function(options) {
            var o = $.extend({}, defaults, options);

            if (hasError(this, o)) { return this; };  // Check for errors.
            this.hide();  // Hide original select box.

            // If there is nothing selected, as is the case initially
            // with multiple select boxes, get the first item on the list.
            var $selectedEls = this.find(":selected");
            if (!$selectedEls.length) {
              $selectedEls = this.find("option").first();
              $selectedEls[0].selected = true;
            }

            // The select box replacement.
            label_text = getSelectedAsText(this, $selectedEls, o);
            var label = $("<div class='gentleselect-label'>" + label_text + "</div>")
                .insertBefore(this)
                .bind("mouseenter.gentleselect", event_handlers.labelHoverIn)
                .bind("mouseleave.gentleselect", event_handlers.labelHoverOut)
                .bind("click.gentleselect", event_handlers.labelClick)
                .data("root", this);
            this.data("label", label)
                .data("options", o);

            // Generate list of options.
            var ul = $("<ul></ul>");
            this.find("option").each(function() {
                var li = $("<li>" + $(this).text() + "</li>")
                    .data("value", $(this).attr("value"))
                    .data("name", $(this).text())
                    .appendTo(ul);
                if ($(this).attr("selected")) { li.addClass("selected"); }
            });

            // Build dialog box.
            var dialog = $("<div class='gentleselect-dialog'></div>")
                .append(ul)
                .insertAfter(label)
                .bind("click.gentleselect", event_handlers.dialogClick)
                .bind("mouseleave.gentleselect", event_handlers.dialogHoverOut)
                .data("label", label)
                .data("root", this);
            this.data("dialog", dialog);
           
            // If to be displayed in columns.
            if (defined(o.columns) || defined(o.rows)) {
                // Update CSS.
                ul.css("float", "left")
                    .find("li").width(o.itemWidth).css("float", "left");
                    
                var f = ul.find("li:first");
                var actualWidth = o.itemWidth 
                    + parseInt(f.css("padding-left")) 
                    + parseInt(f.css("padding-right"));
                var elemCount = ul.find("li").length;
                if (defined(o.columns)) {
                    var cols = parseInt(o.columns);
                    var rows = Math.ceil(elemCount / cols);
                } else {
                    var rows = parseInt(o.rows);
                    var cols = Math.ceil(elemCount / rows);
                }
                dialog.width(actualWidth * cols);

                // Add padding.
                for (var i = 0; i < (rows * cols) - elemCount; i++) {
                    $("<li style='float:left' class='gentleselect-dummy'><span>&nbsp;</span></li>").appendTo(ul);
                }

                // Reorder elements.
                var ptr = [];
                var idx = 0;
                ul.find("li").each(function() {
                    if (idx < rows) { 
                        ptr[idx] = $(this); 
                    } else {
                        var p = idx % rows;
                        $(this).insertAfter(ptr[p]);
                        ptr[p] = $(this);
                    }
                    idx++;
                });
            } else if (typeof o.minWidth == "number") {
                dialog.css("min-width", o.minWidth);
            }

            if (defined(o.title)) {
                $("<div class='gentleselect-title'>" + o.title + "</div>").prependTo(dialog);
            }

            // ESC key should hide all dialog boxes
            $(document).bind("keyup.gentleselect", event_handlers.keyUp);

            // Attach click listener to the document body to detect clicks outside of the dialog box and hide it.
            $("html").click(function() {
                $(".gentleselect-dialog").hide();
            });
            // Hide inactive dialog boxes if the click was inside the select dialog box or the label.
            dialog.click(event_handlers.hideInactive);
            label.click(event_handlers.hideInactive);

            return this;
        },

        // Update the label and dialog box if the select box was updated externally.
        update : function() {
            var opts = this.data("options");

            // Update li with selected data.
            var v = (this.attr("multiple")) ? this.val() : [this.val()];
            $("li", this.data("dialog")).each(function() {
                var $li = $(this);
                var isSelected = ($.inArray($li.data("value"), v) != -1);
                $li.toggleClass("selected", isSelected);
            });

            // Update label.
            var label = getSelectedAsText(this, this.find(":selected"), opts);
            this.data("label").html(label);

            return this;
        }
    };

    var event_handlers = {
        labelHoverIn : function() { 
            $(this).addClass('gentleselect-label-highlight'); 
        },

        labelHoverOut : function() { 
            $(this).removeClass('gentleselect-label-highlight'); 
        },

        labelClick : function() {
            var $this = $(this);
            var pos = $this.position();
            var root = $this.data("root");
            var opts = root.data("options");
            var dialog = root.data("dialog")
                .css("top", pos.top + $this.height())
                .css("left", pos.left + 1);
            if (opts.openEffect == "fade") {
                dialog.fadeIn(opts.openSpeed);
            } else {
                dialog.slideDown(opts.openSpeed);
            }

            if (dialog.attr('display') != 'none') {
              // TODO: Can generate a unique identifier here intead with jquery instead of calling it 'activeDialog'.
              // Make current dialog the global 'active' one.
              $.data(document.body, "activeDialog", dialog[0]);
            }
        },
    
        dialogHoverOut : function() {
            var $this = $(this);
            if ($this.data("root").data("options").hideOnMouseOut) {
                $this.hide();
            }
        },

        dialogClick : function(e) {
            var clicked = $(e.target);
            var $this = $(this);
            var root = $this.data("root");
            var opts = root.data("options");
            if (!root.attr("multiple")) {
                if (opts.closeEffect == "fade") {
                    $this.fadeOut(opts.closeSpeed);
                } else {
                    $this.slideUp(opts.closeSpeed);
                }
            }

            if (clicked.is("li") && !clicked.hasClass("gentleselect-dummy")) {
                var value = clicked.data("value");
                var name = clicked.data("name");
                var label = $this.data("label");

                // Hide the dialog box.
                $this.hide();

                // TODO:
                // Animate the clicked element being inserted or removed.

                if ($this.data("root").attr("multiple")) {
                    clicked.toggleClass("selected");
                    var s = $this.find("li.selected");
                    label.html(getSelectedAsText(root, s, opts));
                    var v = s.map(function() {
                        return $(this).data("value");
                    });
                    // Update actual selectbox and trigger change event.
                    root.val(v.get()).trigger("change");
                } else {
                    $this.find("li.selected").removeClass("selected");
                    clicked.addClass("selected");
                    label.text(clicked.data("name"));
                    // Update actual selectbox and trigger change event.
                    root.val(value).trigger("change");
                }
            }
        },

        keyUp : function(e) {
            if (e.keyCode == 27 ) { // ESC
                $(".gentleselect-dialog").hide();
            }
        },

        hideInactive : function(e) {
          var activeDialog = $.data(document.body, "activeDialog");

          if (e.currentTarget == activeDialog) {
            // If they clicked on a dialog box.

            e.stopPropagation();
            $('.gentleselect-dialog').each(function(key, val) {
                if ($(val).attr('display') != 'none' && val != e.currentTarget) {
                    // Hide all other dialog boxes. Only one should be displayed at a time.
                    $(val).hide();
                }
            });
          } else {
            // If they clicked on a label.

            // Hide all the dialog boxes that are siblings with the other labels.
            e.stopPropagation();
            $('.gentleselect-dialog').each(function(key, val) {
              var $currLabel = $(val).parent().find('.gentleselect-label');

              if ($(val).attr('display') != 'none' && $currLabel[0] != e.currentTarget) {
                // Hide all other dialog boxes. Only one should be displayed at a time.
                $(val).hide();
              }
            });
          }
        }
    };

    $.fn.gentleSelect = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.gentleSelect' );
        }
    };
})(jQuery);
