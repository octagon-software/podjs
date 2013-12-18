/* 
 * Copyright (c) 2013, Octagon Software LLC
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

// Provide a helpful error message if the user forgets to include pod.js first.
if (typeof(PodJS) === "undefined") {
    throw new Error("Must include pod.js script before including pod_scratch.js.");
}

/**
 * @class
 * @classdesc pod.js pod that emulates the scratch programming language.
 * <p>
 * By default, when this pod initializes it looks for a div in the document with the id of "stage" (or whatever is specified in
 * the options). It then attaches to that div and creates a resource called "stage" that is the Scratch stage.
 *
 * @param {type} options The following parameters are supported:
 * <ul>
 *   <li>scratch_stage_div - The id of the div to which the scratch stage should bind. Optional. If not specified, uses the
 *       div called "stage".</li>
 * </ul>
 * @returns {PodJS.ScratchPod}
 */
PodJS.ScratchPod = function(options) {
    // Call super constructor
    PodJS.Pod.call(this, options);

    var ScratchPod_this = this;

    /**
     * The environment this pod is in
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _env = options.env;
    
    /**
     * The div that contains the stage and controls
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _div;
    
    /**
     * The div that contains just the controls
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _controlsDiv;
    
    /**
     * The img for the red stop button
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _redStopButton;
    
    /**
     * The img for the green flag button
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _greenFlagButton;
    
    /**
     * Records the last time the green flag was clicked, in millis since epoch.
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _lastGreenFlagClickTime = 0;
    
    /**
     * True if the green flag is clicked and the scratch app is running or false if not.
     * 
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _running = false;

    /**
     * The div that contains just the stage
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _stageDiv;
    
    /**
     * The canvas inside the div that contains the stage
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _canvas = document.createElement("canvas");
    
    /**
     * The createjs easel that uses the canvas to draw the stage and all sprites.
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _easelStage = null;

    /**
     * The model of the stage
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _stage;

    /**
     * Table of the last time each message was sent.
     *
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _broadcastMessages = {};
    
    /**
     * Global variables that apply to all sprites.
     * 
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _variables = {};
    
    /**
     * Global list variables that apply to all sprites.
     * 
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     */
    var _listVariables = {};
    
    /**
     * Information about each audio resource. Key is spriteName::audioName or just ::audioName for the stage.
     * Value is an AudioInfo object.
     */
    var _audioFiles = {};
    
    /**
     * Path prefix to prepend to all resource paths.
     */
    var _resourcesPathPrefix = "";

    /**
     * @private
     * @instance
     * @memberof PodJS.ScratchPod
     * 
     * @property {string} prefix prefix of the audio id, either the sprite name or "" if the stage.
     * @property {string} name the name of the audio file, from the resource's perspective
     * @property {string} href of the source of the audio
     * @property {boolean} loaded true if loaded, false if still loading.
     */
    var AudioInfo = {
        prefix : "",
        name : "",
        src : "",
        loaded : false
    };

    /**
     * Sanitize HTML
     * Source: http://stackoverflow.com/questions/295566/sanitize-rewrite-html-on-the-client-side
     */
    var _htmlEscape = function(html) {
        var tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';
        var tagOrComment = new RegExp(
            '<(?:'
            // Comment body.
            + '!--(?:(?:-*[^->])*--+|-?)'
            // Special "raw text" elements whose content should be elided.
            + '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*'
            + '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*'
            // Regular name
            + '|/?[a-z]'
            + tagBody
            + ')>',
            'gi');
        var oldHtml;
        do {
            oldHtml = html;
            html = html.replace(tagOrComment, '');
        } while (html !== oldHtml);
        return html.replace(/</g, '&lt;');
    };
    
    // Private Variable class
    var Variable = function(spriteName, variableName) {
        /**
         * HTML DOM element for rendering the variable
         *
         * @instance
         * @member {HTMLElement} _varDiv
         * @memberof PodJS.ScratchPod#Variable
         */
        var _varDiv = document.createElement("div");

        /**
         * HTML DOM element for rendering the variable value
         *
         * @instance
         * @member {HTMLElement} _valueDiv
         * @memberof PodJS.ScratchPod#Variable
         */
        var _valueSpan = document.createElement("span");

        /**
         * CreateJS Container for the visual display of this variable, if shown.
         *
         * @instance
         * @member {createjs.DOMElement} _createJSDOMElement
         * @memberof PodJS.ScratchPod#Variable
         */
        var _createJSDOMElement = new createjs.DOMElement(_varDiv);

        /**
         * @instance
         * @member {number|string} value
         * @memberof PodJS.ScratchPod#Variable
         */
        var _value = 0;
        Object.defineProperty(this, "value", {
            get : function() {
                return _value;
            },
            set : function(value) {
                _value = value;
                _valueSpan.innerHTML = _htmlEscape(String(_value));
            }
        });
        
        /**
         * True if the variable can be seen on the stage, or false if it is hidden.
         * @instance
         * @member {boolean} hidden
         * @memberof PodJS.ScratchPod#Variable
         */
        var _shown = false;
        Object.defineProperty(this, "shown", {
            get : function() {
                return _shown;
            },
            set : function(value) {
                _shown = value;
                if (value) {
                    _easelStage.addChild(_createJSDOMElement);
                    _varDiv.style.visibility = "visible";
                } else {
                    _easelStage.removeChild(_createJSDOMElement);
                    _varDiv.style.visibility = "hidden";
                }
            }
        });

        /**
         * X position of the variable on the stage, when shown.
         *
         * @instance
         * @member {number} x
         * @memberof PodJS.ScratchPod#Variable
         */
        var _x = 0;
        Object.defineProperty(this, "x", {
            get : function() {
                return _x;
            },
            set : function(value) {
                _x = value;
                _createJSDOMElement.x = value;
            }
        });

        /**
         * Y position of the variable on the stage, when shown.
         *
         * @instance
         * @member {number} y
         * @memberof PodJS.ScratchPod#Variable
         */
        var _y = 0;
        Object.defineProperty(this, "y", {
            get : function() {
                return _y;
            },
            set : function(value) {
                _y = value;
                _createJSDOMElement.y = value;
            }
        });
        
        var construct = function() {
            // mimic the style of Scratch's variable display but use a DOM object.
            _varDiv.innerHTML = ((spriteName === null) ? "" : (spriteName + ": ")) + variableName;
            _varDiv.className = "podjs_scratch_var_div";
            _stageDiv.insertBefore(_varDiv, _stageDiv.firstChild);
            _valueSpan.innerHTML = "0";
            _valueSpan.className = "podjs_scratch_var_value";
            _varDiv.appendChild(_valueSpan);
        };
        construct();
    };

    /**
     * @class
     * @classdesc List variable containing both the list contents and the display.
     */
    this.ListVariable = function(spriteName, listVariableName) {
        /**
         * HTML DOM element for rendering the list variable
         *
         * @instance
         * @member {HTMLElement} _varDiv
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _varDiv = document.createElement("div");

        /**
         * HTML DOM element for rendering the list variable
         *
         * @instance
         * @member {HTMLElement} _valueDiv
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _valueDiv = document.createElement("div");

        /**
         * HTML DOM element for rendering the list variable
         *
         * @instance
         * @member {HTMLElement} _domList
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _domList = document.createElement("ul");

        /**
         * HTML DOM element for rendering the list length
         *
         * @instance
         * @member {HTMLElement} _lengthSpan
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _lengthDiv = document.createElement("div");

        /**
         * CreateJS Container for the visual display of this list variable, if shown.
         *
         * @instance
         * @member {createjs.DOMElement} _createJSDOMElement
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _createJSDOMElement = new createjs.DOMElement(_varDiv);

        /**
         * @instance
         * @member {object[]} value
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _list = [];
        
        /**
         * True if the list variable can be seen on the stage, or false if it is hidden.
         * @instance
         * @member {boolean} hidden
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _shown = false;
        Object.defineProperty(this, "shown", {
            get : function() {
                return _shown;
            },
            set : function(value) {
                _shown = value;
                if (value) {
                    _easelStage.addChild(_createJSDOMElement);
                    _varDiv.style.visibility = "visible";
                } else {
                    _easelStage.removeChild(_createJSDOMElement);
                    _varDiv.style.visibility = "hidden";
                }
            }
        });
        
        /**
         * X position of the list variable on the stage, when shown.
         *
         * @instance
         * @member {number} x
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _x = 0;
        Object.defineProperty(this, "x", {
            get : function() {
                return _x;
            },
            set : function(value) {
                _x = value;
                _createJSDOMElement.x = value;
            }
        });

        /**
         * Y position of the list variable on the stage, when shown.
         *
         * @instance
         * @member {number} y
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _y = 0;
        Object.defineProperty(this, "y", {
            get : function() {
                return _y;
            },
            set : function(value) {
                _y = value;
                _createJSDOMElement.y = value;
            }
        });

        /**
         * Width of the list variable on the stage, when shown.
         *
         * @instance
         * @member {number} width
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _width = null;
        Object.defineProperty(this, "width", {
            get : function() {
                return _width;
            },
            set : function(value) {
                _width = value;
                if (value !== null) {
                    _varDiv.style.width = Number(value) + "px";
                }
            }
        });

        /**
         * Height of the list variable on the stage, when shown.
         *
         * @instance
         * @member {number} height
         * @memberof PodJS.ScratchPod#ListVariable
         */
        var _height = null;
        Object.defineProperty(this, "height", {
            get : function() {
                return _height;
            },
            set : function(value) {
                _height = value;
                if (value !== null) {
                    _varDiv.style.height = Number(value) + "px";
                }
            }
        });

        /**
         * Create the DOM list item for an item of the list.
         *
         * @private
         * @instance
         * @method _createListItem
         * @param {string|number} value The value to display
         * @return {HTMLElement} A list item HTML element.
         */
        var _createListItem = function(value) {
            var li = document.createElement("li");
            li.className = "podjs_scratch_list_var_item";
            
            var span = document.createElement("span");
            span.className = "podjs_scratch_list_var_item_span";
            span.innerHTML = _htmlEscape(String(value));
            li.appendChild(span);
            _updateLength();
            return li;
        };

        /**
         * Update the display of the length of this list.
         * 
         * @private
         * @instance
         * @method _updateLength
         */
        var _updateLength = function() {
            _lengthDiv.innerHTML = "length: " + _list.length;
        };

        /**
         * Add an item to the end of the list
         * 
         * @instance
         * @method add
         * @param {number|string} value The item to add to the list
         * @memberof PodJS.ScratchPod#ListVariable
         */
        this.add = function(value) {
            _list.push(value);
            var li = _createListItem(value);
            _domList.appendChild(li);
            _updateLength();
        };
        
        /**
         * Delete an item from the list
         * 
         * @instance
         * @method deleteAll
         * @memberof PodJS.ScratchPod#ListVariable
         */
        this.deleteAll = function() {
            _list.length = 0;
            _domList.innerHTML = "";
            _updateLength();
        };

        /**
         * Delete item from the list at the given index
         * 
         * @instance
         * @method deleteAt
         * @param {number} index The index to delete from, 0-based.
         * @memberof PodJS.ScratchPod#ListVariable
         */
        this.deleteAt = function(index) {
            if (index >= 0 && index < _list.length) {
                _list.splice(index, 1);
                _domList.removeChild(_domList.childNodes[index]);
                _updateLength();
            }
        };
        
        /**
         * Insert item into the list at the given index
         * 
         * @instance
         * @method insertAt
         * @param {number|string} value The value to insert into the list
         * @param {number} index The index to insert at, 0-based. All other items are shifted towards the end of the list.
         * @memberof PodJS.ScratchPod#ListVariable
         */
        this.insertAt = function(value, index) {
            if (index >= 0 && index <= _list.length) {
                var atEnd = index === _list.length;
                _list.splice(index, 0, value);
                var li = _createListItem(value);
                if (atEnd) {
                    _domList.appendChild(li);
                } else {
                    _domList.insertBefore(li, _domList.childNodes[index]);
                }
                _updateLength();
            }
        };
        
        /**
         * Replace item at the given index
         * 
         * @instance
         * @method replaceAt
         * @param {number|string} value The value to replace in the list
         * @param {number} index The index to insert at, 0-based.
         * @memberof PodJS.ScratchPod#ListVariable
         */
        this.replaceAt = function(value, index) {
            if (index >= 0 && index < _list.length) {
                _list.splice(index, 1, value);
                _domList.childNodes[index].getElementsByTagName("span")[0].innerHTML = _htmlEscape(String(value));
            }
        };
        
        /**
         * Return item at the given index
         * 
         * @instance
         * @method getAt
         * @param {number} index The index of the element to retrieve
         * @return {number|string} The value at the given index in the list.
         * @memberof PodJS.ScratchPod#ListVariable
         */
        this.getAt = function(index) {
            var result = "";
            if (index >= 0 && index < _list.length) {
                result = _list[index];
            }
            return result;
        };
        
        /**
         * Returns the list of the list
         * 
         * @instance
         * @method length
         * @return {number} The number of items in the list
         * @memberof PodJS.ScratchPod#ListVariable
         */
        this.length = function() {
            return _list.length;
        };

        /**
         * Returns true if the list contains the given item, or false if not.
         * 
         * @instance
         * @method length
         * @param {number|string} value The item to check the list for
         * @return {boolean} true if the list contains the item or false if not.
         * @memberof PodJS.ScratchPod#ListVariable
         */
        this.contains = function(value) {
            return _list.indexOf(value) !== -1;
        };
        
        var construct = function() {
            // mimic the style of Scratch's variable display but use a DOM object.
            _varDiv.innerHTML = ((spriteName === null) ? "" : (spriteName + ": ")) + listVariableName;
            _varDiv.className = "podjs_scratch_list_var";
            _stageDiv.insertBefore(_varDiv, _stageDiv.firstChild);

            _domList.className = "podjs_scratch_list_var_list";
            _varDiv.appendChild(_valueDiv);
            
            _valueDiv.className = "podjs_scratch_list_value_div";
            _valueDiv.appendChild(_domList);
            
            _lengthDiv.className = "podjs_scratch_list_var_length_div";
            _updateLength();
            _varDiv.appendChild(_lengthDiv);
        };
        construct();
    };

    /**
     * Returns true if the value provided should be considered true, or false if not.
     * 
     * @private
     * @instance
     * @param val The value to evaluate for truthiness.
     * @memberof PodJS.ScratchPod
     */
    var truthy = function(val) {
        return String(val) === "true";
    };


    /**
     * Automatically set the starting position of the variable when shown.
     * 
     * @instance
     * @method _autoPositionVariable
     * @param {PodJS.ScratchPod.Variable} variable The variable to position.
     * @memberof PodJS.ScratchPod
     */
    var _autoVariableX = -230;
    var _autoVariableY = -170;
    var _autoPositionVariable = function(variable) {
        variable.x = _autoVariableX;
        variable.y = _autoVariableY;
        _autoVariableY += 30;
        if (_autoVariableY > 200) {
            _autoVariableY = -170;
            _autoVariableX += 100;
        }
    };

    /**
     * Automatically set the starting position of the list variable when shown.
     * 
     * @instance
     * @method _autoPositionListVariable
     * @param {PodJS.ScratchPod.ListVariable} listVariable The list variable to position.
     * @memberof PodJS.ScratchPod
     */
    var _autoPositionListVariable = function(listVariable) {
        listVariable.x = _autoVariableX;
        listVariable.y = _autoVariableY;
        _autoVariableY += 200;
        if (_autoVariableY > 200) {
            _autoVariableY = -170;
            _autoVariableX += 100;
        }
    };

    /**
     * Create a new variable for all sprites with the given name.
     * 
     * @instance
     * @method createVariable
     * @param {string} name the name of the variable
     * @memberof PodJS.ScratchPod
     */
    this.createVariable = function(name) {
        if (_variables.hasOwnProperty(name)) {
            throw "All Sprites already has a variable called '" + name + "'";
        }
        var variable = new Variable(null, name);
        _autoPositionVariable(variable);
        _variables[name] = variable;
    };

    /**
     * Create a new list variable for all sprites with the given name.
     * 
     * @instance
     * @method createListVariable
     * @param {string} name the name of the list variable
     * @memberof PodJS.ScratchPod
     */
    this.createListVariable = function(name) {
        if (_listVariables.hasOwnProperty(name)) {
            throw "All Sprites already has a list variable called '" + name + "'";
        }
        var listVariable = new ScratchPod_this.ListVariable(null, name);
        _autoPositionListVariable(listVariable);
        _listVariables[name] = listVariable;
    };

    /**
     * Set the value of the given variable to the given value.
     * 
     * @instance
     * @method setVariable
     * @param {string} name the name of the variable
     * @param {number|string} value the value to set the variable to
     * @memberof PodJS.ScratchPod
     */
    this.setVariable = function(name, value) {
        if (!_variables.hasOwnProperty(name)) {
            throw "All Sprites does not have a variable called '" + name + "'";
        }
        _variables[name].value = value;
    };

    /**
     * Sets whether this variable is shown on the stage, and the location at which it is shown.
     * 
     * @instance
     * @method showVariable
     * @param {string} name the name of the variable
     * @param {boolean} shown true if the variable is to be shown, or false if not. Optional, defaults to true.
     * @param {number} x x position of the variable on the stage (optional, defaults to 0)
     * @param {number} y y position of the variable on the stage (optional, defaults to 0)
     * @memberof PodJS.ScratchPod
     */
    this.showVariable = function(name, shown, x, y) {
        if (typeof(shown) === "undefined") {
            shown = true;
        }
        if (typeof(x) !== "undefined") {
            _variables[name].x = x;
        }
        if (typeof(y) !== "undefined") {
            _variables[name].y = y;
        }
        if (!_variables.hasOwnProperty(name)) {
            throw "All Sprites does not have a variable called '" + name + "'";
        }
        _variables[name].shown = shown;
    };

    /**
     * Sets whether this list variable is shown on the stage, and the location at which it is shown.
     * 
     * @instance
     * @method showListVariable
     * @param {string} name the name of the list variable
     * @param {boolean} shown true if the list variable is to be shown, or false if not. Optional, defaults to true.
     * @param {number} x x position of the list variable on the stage (optional, defaults to 0)
     * @param {number} y y position of the list variable on the stage (optional, defaults to 0)
     * @param {number} width width Width of the box to show (optional, defaults to enough width to show small ints)
     * @param {number} height height of the box to show (optional, defaults to 8 rows worth of pixels)
     * @memberof PodJS.ScratchPod
     */
    this.showListVariable = function(name, shown, x, y, width, height) {
        if (typeof(shown) === "undefined") {
            shown = true;
        }
        if (typeof(x) !== "undefined" && x !== null) {
            _listVariables[name].x = x;
        }
        if (typeof(y) !== "undefined" && y !== null) {
            _listVariables[name].y = y;
        }
        if (typeof(width) !== "undefined") {
            _listVariables[name].width = width;
        }
        if (typeof(height) !== "undefined") {
            _listVariables[name].height = height;
        }
        if (!_listVariables.hasOwnProperty(name)) {
            throw "All Sprites does not have a list variable called '" + name + "'";
        }
        _listVariables[name].shown = shown;
    };

    /**
     * Get the value of the given variable.
     * 
     * @instance
     * @method getVariable
     * @param {string} name the name of the variable
     * @return The value of the variable.
     * @memberof PodJS.ScratchPod
     */
    this.getVariable = function(name) {
        if (!_variables.hasOwnProperty(name)) {
            throw "Sprite does not have a variable called '" + name + "'";
        }
        return _variables[name].value;
    };

    /**
     * Get the list variable.
     * 
     * @instance
     * @method getListVariable
     * @param {string} name the name of the list variable
     * @return {PodJS.ScratchPod.ListVariable} The list variable.
     * @memberof PodJS.ScratchPod
     */
    this.getListVariable = function(name) {
        if (!_listVariables.hasOwnProperty(name)) {
            throw "Sprite does not have a list variable called '" + name + "'";
        }
        return _listVariables[name];
    };

    /**
     * Returns true if the variable exists for all sprites, or false if not.
     * 
     * @instance
     * @method hasVariable
     * @param {string} name the name of the variable
     * @return {boolean} true if the variable exists or false if not.
     * @memberof PodJS.ScratchPod
     */
    this.hasVariable = function(name) {
        return _variables.hasOwnProperty(name);
    };

    /**
     * Returns true if the list variable exists for all sprites, or false if not.
     * 
     * @instance
     * @method hasListVariable
     * @param {string} name the name of the list variable
     * @return {boolean} true if the list variable exists or false if not.
     * @memberof PodJS.ScratchPod
     */
    this.hasListVariable = function(name) {
        return _listVariables.hasOwnProperty(name);
    };
    
    /**
     * Returns the sprite with the given name
     * 
     * @instance
     * @method sprite
     * @param {string} name the name of the sprite
     * @return {PodJS.ScratchPod.Sprite} the sprite
     * @memberof PodJS.ScratchPod
     */
    this.sprite = function(name) {
        var result = this.getResourceByName(name);
        if (result === null || result.resourceType !== "sprite") {
            throw new Error("No sprite with the name '" + name + "' found.");
        }
        return result;
    }

    /**
     * Part of the Pod standard interface - return information about the blocks provided
     * by the scratch pod.
     *
     * @public
     * @instance
     * @method getBlockTypes
     * @memberof PodJS.ScratchPod
     * @return {object[]} One info object for each block.
     */
    this.getBlockTypes = function() {
        return [
            //////////////////////////////////////////////////////////////
            // Motion Blocks
            {
                blockType : "change_x",
                description : "The block moves its sprite costume center's X position by the specified amount.",
                parameterInfo : [
                    { name : "steps" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    var arg = context.blockScript.nextArgument();
                    console.log("change_x " + arg);
                    var sprite = context.resource;
                    sprite.translate(arg, 0);
                    context.blockScript.nextBlock();
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "change_y",
                description : "The block moves its sprite costume center's Y position by the specified amount.",
                parameterInfo : [
                    { name : "steps" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    var arg = context.blockScript.nextArgument();
                    console.log("change_y " + arg);
                    var sprite = context.resource;
                    sprite.translate(0, arg);
                    context.blockScript.nextBlock();
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "move",
                description : "Moves its sprite forward the specified amount of steps in the direction it is facing, a " +
                    "step being 1 pixel length.",
                parameterInfo : [
                    { name : "steps" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    var arg = context.blockScript.nextArgument();
                    console.log("move " + arg);
                    var sprite = context.resource;
                    sprite.moveSteps(arg);
                    context.blockScript.nextBlock();
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "point_dir",
                description : "The block points its sprite in the specified direction; this rotates the sprite.",
                parameterInfo : [
                    { name : "degrees" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    var arg = context.blockScript.nextArgument();
                    console.log("point_dir " + arg);
                    var sprite = context.resource;
                    sprite.setDirection(arg);
                    context.blockScript.nextBlock();
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "go_xy",
                description : "sets the sprite's X and Y position to the specified amounts.",
                parameterInfo : [
                    { name : "x" },
                    { name : "y" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    var x = context.blockScript.nextArgument();
                    var y = context.blockScript.nextArgument();
                    console.log("go_xy " + x + " " + y);
                    var sprite = context.resource;
                    sprite.goXY(x, y);
                    context.blockScript.nextBlock();
                    context.blockScript.yield = true;
                }
            },
            
            //////////////////////////////////////////////////////////////
            // Looks Blocks
            {
                blockType : "costume",
                description : "Changes the Sprite's costume to the specified one.",
                parameterInfo : [
                    { name : "costume" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    var arg = context.blockScript.nextArgument();
                    console.log("costume " + arg);
                    var sprite = context.resource;
                    sprite.setCostume(arg);
                    context.blockScript.nextBlock();
                }
            },
            {
                blockType : "hide",
                description : "If the block's sprite is shown, it will hide the sprite - if the sprite is already hidden, nothing happens.",
                parameterInfo : [],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    console.log("hide");
                    var sprite = context.resource;
                    if (sprite.isShown()) {
                        sprite.setShown(false);
                    }
                    context.blockScript.nextBlock();
                }
            },
            {
                blockType : "show",
                description : "If the block's sprite is hidden, it will show the sprite - if the sprite is already showing, nothing will change.",
                parameterInfo : [],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    console.log("show");
                    var sprite = context.resource;
                    if (!sprite.isShown()) {
                        sprite.setShown(true);
                    }
                    context.blockScript.nextBlock();
                }
            },

            //////////////////////////////////////////////////////////////
            // Sound Blocks
            {
                blockType : "play_sound",
                description : "The block will play the specified sound, with no pause to its script",
                parameterInfo : [
                    { name : "audioId" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var audioId = context.blockScript.nextArgument();
                    console.log("play_sound " + audioId);
                    context.resource.playSound(audioId);
                    context.blockScript.nextBlock();
                }
            },
            {
                blockType : "stop_all_sounds",
                description : "The block will stop any sounds currently being played on all sprites and the Stage.",
                parameterInfo : [],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    console.log("stop_all_sounds");
                    ScratchPod_this.stopAllSounds();
                    context.blockScript.nextBlock();
                }
            },
            
            //////////////////////////////////////////////////////////////
            // EventBlocks
            {
                blockType : "broadcast",
                description : "Sends a broadcast throughout the whole Scratch program. Any scripts in any sprites that " +
                    "are hatted with the When I Receive () block that is set to a specified broadcast will activate.",
                parameterInfo : [ { "name" : "message" } ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var message = context.blockScript.nextArgument();
                    console.log("broadcast " + message);
                    _broadcastMessages[message] = Date.now();
                    context.blockScript.nextBlock();
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "when_green_flag_clicked",
                description : "Scripts that wear this block will activate once the Green Flag has been clicked - " +
                    "these scripts can activate other scripts and enable the entire program.",
                parameterInfo : [],
                returnsValue : false,
                eventBlock : true,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var lastGreenFlagClickTime = context.block.hasOwnProperty("lastGreenFlagClickTime") ?
                        context.block.lastGreenFlagClickTime : null;
                    if (lastGreenFlagClickTime === null) {
                        var now = Date.now();
                        lastGreenFlagClickTime = now;
                        context.block.lastGreenFlagClickTime = lastGreenFlagClickTime;
                    } else if (_lastGreenFlagClickTime > lastGreenFlagClickTime) {
                        context.block.lastGreenFlagClickTime = _lastGreenFlagClickTime;
                        console.log("when_green_flag_clicked");
                        context.blockScript.nextBlock();
                    }
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "when_receive",
                description : "Scripts that begin with this block will be invoked once the specified broadcast has " +
                    "been sent by a calling script.",
                parameterInfo : [ { "name" : "message" }],
                returnsValue : false,
                eventBlock : true,
                compatibleWith : function(resource) {
                    return true;
                },
                reset : function(context) {
                    delete context.block.messageName;
                    delete context.block.nextIP;
                },
                tick : function(context) {
                    var messageName;
                    if (context.block.hasOwnProperty("messageName")) {
                        messageName = context.block.messageName;
                    } else {
                        var ip = context.blockScript.index;
                        messageName = context.blockScript.nextArgument();
                        context.block.nextIP = context.blockScript.index + 1;
                        context.blockScript.index = ip;
                        context.block.messageName = messageName;
                    }
                    var lastEventTime = context.block.hasOwnProperty("lastEventTime") ? context.block.lastEventTime : null;
                    if (lastEventTime === null) {
                        var now = Date.now();
                        lastEventTime = now;
                        context.block.lastEventTime = lastEventTime;
                    } else if (_broadcastMessages.hasOwnProperty(messageName) && _broadcastMessages[messageName] > lastEventTime) {
                        context.block.lastEventTime = _broadcastMessages[messageName];
                        console.log("when_receive " + messageName);
                        context.blockScript.nextBlock();
                        context.blockScript.index = context.block.nextIP;
                        this.reset(context);
                    }
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "when_sprite_clicked",
                description : "Scripts that wear the block will activate once its sprite is clicked.",
                parameterInfo : [],
                returnsValue : false,
                eventBlock : true,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite";
                },
                tick : function(context) {
                    var sprite = context.resource;
                    var lastSpriteClickTime = context.block.hasOwnProperty("lastSpriteClickTime") ?
                        context.block.lastSpriteClickTime : null;
                    if (lastSpriteClickTime === null) {
                        var now = Date.now();
                        lastSpriteClickTime = now;
                        context.block.lastSpriteClickTime = lastSpriteClickTime;
                    } else if (sprite.lastClickTime > lastSpriteClickTime) {
                        context.block.lastSpriteClickTime = sprite.lastClickTime;
                        console.log("when_sprite_clicked");
                        context.blockScript.nextBlock();
                    }
                    context.blockScript.yield = true;
                }
            },

            //////////////////////////////////////////////////////////////
            // Control Blocks
            {
                blockType : "otherwise",
                description : "This block should be placed immediately after an if_then begin/end block to be executed if the " +
                    "condition is false. The otherwise should have its own begin/end block. This block is not legal when used " +
                    "by itself.",
                parameterInfo : [],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return true;
                },
                reset : function(context) {
                },
                tick : function(context) {
                    throw new Error("otherwise block cannot be used by itself - it must be placed after an if_then " +
                        "begin/end block. A common cause of this error is a missing 'end' before an 'otherwise'.");
                }
            },
            {
                blockType : "forever",
                description : "Blocks held inside this block will be in a loop - just like the Repeat () block and the " +
                    "Repeat Until () block, except that the loop never ends (unless the stop sign is clicked, the Stop All " +
                    "block is activated, or the stop script block is activated within the loop).",
                parameterInfo : [],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    console.log("forever");
                    context.blockScript.pushIP();
                    context.blockScript.nextBlock();
                }
            },
            {
                blockType : "if_then",
                description : "The block will check its boolean condition: if the condition is true, the code held inside the " +
                    "first begin/end will activate, and then the script will continue; if the condition is false, then if " +
                    "an otherwise block is present immediately after the end the code inside the second begin/end will activate.",
                parameterInfo : [ { name : "condition" } ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return true;
                },
                reset : function(context) {
                    delete context.block.evaluated;
                    delete context.block.nextIP;
                },
                tick : function(context) {
                    if (typeof(context.block.evaluated) === "undefined") {
                        var ipOfIfElse = context.blockScript.index;
                        context.block.evaluated = true;
                        var condition = truthy(context.blockScript.nextArgument());
                        context.blockScript.nextBlock();
                        context.block.nextIP = context.blockScript.index;
                        console.log("if_then " + condition);
                        if (condition) {
                            context.blockScript.index = ipOfIfElse;
                            context.blockScript.pushIP();
                            context.blockScript.index = context.block.nextIP;
                        } else {
                            context.blockScript.skipBeginEndBlock();
                            var b = context.blockScript.peekBlock();
                            if (b != null && b.blockType === "otherwise") {
                                // execute the otherwise block
                                context.blockScript.nextBlock();
                                var beginIP = context.blockScript.index;
                                console.log("otherwise");
                                context.blockScript.index = ipOfIfElse;
                                context.blockScript.pushIP();
                                context.blockScript.index = beginIP;
                            }
                        }
                    } else {
                        // hit the end block and now we're back to the if or otherwise block to see where to go next.
                        // Always skip begin/end.
                        context.blockScript.index = context.block.nextIP;
                        context.blockScript.skipBeginEndBlock();
                        var b = context.blockScript.peekBlock();
                        if (b.blockType === "otherwise") {
                            context.blockScript.nextBlock();
                            // skip past begin/end of otherwise as well.
                            context.blockScript.skipBeginEndBlock();
                        }
                        delete context.block.evaluated;
                        delete context.block.nextIP;
                    }
                }
            },
            {
                blockType : "repeat",
                description : "Blocks held inside this block will loop a given amount of times, before allowing the " +
                    "script to continue.",
                parameterInfo : [
                    { name : "count" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return true;
                },
                reset : function(context) {
                    delete context.block.remaining;
                    delete context.block.nextIP;
                },
                tick : function(context) {
                    var ipOfRepeat = context.blockScript.index;
                    if (typeof(context.block.remaining) === "undefined") {
                        context.block.remaining = Math.ceil(Number(context.blockScript.nextArgument()));
                        context.blockScript.nextBlock();
                        context.block.nextIP = context.blockScript.index;
                    } else {
                        context.blockScript.index = context.block.nextIP;
                    }
                    if (context.block.remaining > 0) {
                        console.log("repeat " + context.block.remaining);
                        context.block.remaining--;
                        var beginIP = context.blockScript.index;
                        context.blockScript.index = ipOfRepeat;
                        context.blockScript.pushIP();
                        context.blockScript.index = beginIP;
                    } else {
                        context.blockScript.skipBeginEndBlock();
                        this.reset(context);
                    }
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "repeat_until",
                description : "Blocks held inside this block will loop until the specified boolean statement is true, " +
                    "in which case the code beneath the block (if any) will execute.",
                parameterInfo : [
                    { name : "condition" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return true;
                },
                reset : function(context) {
                },
                tick : function(context) {
                    var ipOfRepeatUntil = context.blockScript.index;
                    var condition = truthy(context.blockScript.nextArgument());
                    context.blockScript.nextBlock();
                    console.log("repeat_until " + condition);
                    if (condition) {
                        context.blockScript.skipBeginEndBlock();
                    } else {
                        var beginIP = context.blockScript.index;
                        context.blockScript.index = ipOfRepeatUntil;
                        context.blockScript.pushIP();
                        context.blockScript.index = beginIP;
                    }
                    context.blockScript.yield = true;
                }
            },
            {
                blockType : "wait",
                description : "pauses its script for the specified amount of seconds - the wait can also be a decimal number.",
                parameterInfo : [
                    { name : "seconds" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return true;
                },
                reset : function(context) {
                    delete context.block.endTime;
                    delete context.block.nextIP;
                },
                tick : function(context) {
                    var now = Date.now();
                    var endTime = context.block.hasOwnProperty("endTime") ? context.block.endTime : null;
                    if (endTime === null) {
                        console.log("wait");
                        var ip = context.blockScript.index;
                        var delay = context.blockScript.nextArgument();
                        context.block.nextIP = context.blockScript.index + 1;
                        context.blockScript.index = ip;
                        endTime = now + delay * 1000;
                        context.block.endTime = endTime;
                    }
                    if (now >= endTime) {
                        context.blockScript.index = context.block.nextIP;
                        this.reset(context);
                    } else {
                        context.blockScript.yield = true;
                    }
                }
            },
            {
                blockType : "wait_until",
                description : "The block pauses its script until the specified boolean condition is true.",
                parameterInfo : [
                    { name : "condition" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return true;
                },
                reset : function(context) {
                },
                tick : function(context) {
                    var ip = context.blockScript.index;
                    var condition = truthy(context.blockScript.nextArgument());
                    console.log("wait_until " + condition);
                    if (condition) {
                        context.blockScript.nextBlock();
                    } else {
                        context.blockScript.index = ip;
                    }
                    context.blockScript.yield = true;
                }
            },

            //////////////////////////////////////////////////////////////
            // Sensing Blocks
            {
                blockType : "touching",
                description : "The block checks if its sprite is touching the mouse-pointer (use the string 'mouse_pointer'), " +
                    "edge (use the string 'edge'), or another sprite (a Reporter block holding the sprite's name can be " +
                    "used). If the sprite is touching the selected object, the block returns true; if it is not, it " +
                    "returns false.",
                parameterInfo : [
                    { name : "object" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var result = false;
                    var obj = context.blockScript.nextArgument();
                    
                    var sprite = context.resource;
                    var bitmap = null;
                    var costume = sprite._getCurrentCostumeObject();
                    if (costume !== null) {
                        bitmap = costume.getEaselBitmap();
                    }

                    if (obj === "mouse-pointer") {
                        // This should return true even if the object is hidden
                        if (bitmap !== null) {
                            var spritePoint = bitmap.globalToLocal(_easelStage.mouseX, _easelStage.mouseY);
                            result = bitmap.hitTest(spritePoint.x, spritePoint.y);
                        }
                    } else if (obj === "edge") {
                        // This should return true even if the object is hidden
                        // TODO: Implement this
                    } else {
                        // assume a sprite name.
                        var otherSprite = ScratchPod_this.getResourceByName(obj);
                        if (otherSprite === null) {
                            console.log("No sprite found by the name of '" + obj + "'.");
                            result = false;
                        } else {
                            var otherBitmap = null;
                            var otherCostume = otherSprite._getCurrentCostumeObject();
                            if (otherCostume !== null) {
                                otherBitmap = otherCostume.getEaselBitmap();
                            }
                            
                            if (bitmap !== null && otherBitmap !== null) {
                                result = ndgmr.checkPixelCollision(bitmap, otherBitmap) ? true : false;
                            }
                        }
                        // Should not return true if either sprite is hidden
                    }
                    console.log("touching " + obj + " == " + result);
                    return result;
                }
            },

            //////////////////////////////////////////////////////////////
            // Operators Blocks
            {
                blockType : "equals",
                description : "The block checks if the first value is equal to the other value. If the values are equal, " +
                    "the block returns true; if not, false.",
                parameterInfo : [
                    { name : "firstValue" },
                    { name : "secondValue" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var firstValue = context.blockScript.nextArgument();
                    var secondValue = context.blockScript.nextArgument();
                    var result = (firstValue.toString() === secondValue.toString()).toString();
                    console.log("equals " + firstValue + " " + secondValue + " == " + result);
                    return result;
                }
            },
            {
                blockType : "greater",
                description : "The block checks if the first value is greater than the second value. If it is greater, the " +
                    "block returns true; if not, it returns false.",
                parameterInfo : [
                    { name : "firstValue" },
                    { name : "secondValue" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var firstValue = context.blockScript.nextArgument();
                    var secondValue = context.blockScript.nextArgument();
                    var result = (Number(firstValue) > Number(secondValue)).toString();
                    console.log("greater " + firstValue + " " + secondValue + " == " + result);
                    return result;
                }
            },
            {
                blockType : "join",
                description : "concatenates, or \"links\" the two values together and reports the result - for example, " +
                    "if \"hello\" and \"world\" were put in the block, it would report \"helloworld\". ",
                parameterInfo : [
                    { name : "firstValue" },
                    { name : "secondValue" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var firstValue = context.blockScript.nextArgument();
                    var secondValue = context.blockScript.nextArgument();
                    var result = String(firstValue) + String(secondValue);
                    console.log("join " + firstValue + " " + secondValue + " == " + result);
                    return result;
                }
            },
            {
                blockType : "less",
                description : "The block checks if the first value is less than the second value. If it is less, the " +
                    "block returns true; if not, it returns false.",
                parameterInfo : [
                    { name : "firstValue" },
                    { name : "secondValue" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var firstValue = context.blockScript.nextArgument();
                    var secondValue = context.blockScript.nextArgument();
                    var result = (Number(firstValue) < Number(secondValue)).toString();
                    console.log("less " + firstValue + " " + secondValue + " == " + result);
                    return result;
                }
            },
            {
                blockType : "not",
                description : "The block checks if the boolean inside it is false - if it is false, the block returns " +
                    "true; if the condition is true, it returns false.",
                parameterInfo : [
                    { name : "value" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var value = context.blockScript.nextArgument();
                    var result = String(!truthy(value));
                    console.log("not " + value + " == " + result);
                    return result;
                }
            },
            {
                blockType : "random_from_to",
                description : "picks a psuedorandom number ranging from the first given number to the second, including " +
                    "both endpoints. If both numbers have no decimals, it will report a whole number. For example, " +
                    "if a 1 and a 3 were imputed, the block could return a 1, 2 or 3. If one of the numbers has a decimal " +
                    "point, even .0, it reports a number with a decimal.",
                parameterInfo : [
                    { name : "from" },
                    { name : "to" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return true;
                },
                tick : function(context) {
                    var from = context.blockScript.nextArgument();
                    var to = context.blockScript.nextArgument();
                    var floatingPoint = (String(from).indexOf('.') !== -1) || (String(to).indexOf('.') !== -1);
                    from = Number(from);
                    to = Number(to);
                    var result;
                    if (floatingPoint) {
                        // return floating-point number
                        result = from + Math.random() * (to - from);
                    }  else {
                        // return int number
                        result = Math.floor(from + Math.random() * (to - from + 1));
                    }
                    console.log("random_from_to " + from + " to " + to + " == " + result);
                    return result;
                }
            },

            //////////////////////////////////////////////////////////////
            // Data Blocks
            {
                blockType : "add_to",
                description : "Adds an item to the specified list, the item containing the given text.",
                parameterInfo : [
                    { name : "value" },
                    { name : "listVariable" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var value = context.blockScript.nextArgument();
                    var listVariable = context.blockScript.nextArgument();
                    
                    if (resource.resourceType === "sprite" && resource.hasListVariable(listVariable)) {
                        var sprite = resource;
                        var list = sprite.getListVariable(listVariable);
                        list.add(value);
                    } else if (ScratchPod_this.hasListVariable(listVariable)) {
                        var list = ScratchPod_this.getListVariable(listVariable);
                        list.add(value);
                    } else {
                        throw new Error("List variable '" + listVariable + "' is not defined.");
                    }
                    context.blockScript.nextBlock();
                    console.log("add_to " + value + " " + listVariable);
                }
            },
            {
                blockType : "change_by",
                description : "The block will change the specified variable by the given amount. If the variable is a " +
                    "string and not a number, the variable will be set to the amount that the block was supposed to " +
                    "change the variable by",
                parameterInfo : [
                    { name : "variable" },
                    { name : "delta" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var variable = context.blockScript.nextArgument();
                    var delta = context.blockScript.nextArgument();
                    if (typeof(delta) !== "number") {
                        throw new Error("For change_by block, delta must be a number.");
                    }
                    
                    var oldValue;
                    var newValue;
                    if (resource.resourceType === "sprite" && resource.hasVariable(variable)) {
                        var sprite = resource;
                        oldValue = sprite.getVariable(variable);
                        if (typeof(oldValue) === "string") {
                            oldValue = 0;
                        }
                        newValue = oldValue + delta;
                        sprite.setVariable(variable, newValue);
                    } else if (ScratchPod_this.hasVariable(variable)) {
                        oldValue = ScratchPod_this.getVariable(variable);
                        if (typeof(oldValue) === "string") {
                            oldValue = 0;
                        }
                        newValue = oldValue + delta;
                        ScratchPod_this.setVariable(variable, newValue);
                    } else {
                        throw new Error("Variable '" + variable + "' is not defined.");
                    }
                    context.blockScript.nextBlock();
                    console.log("change_by " + variable + " " + oldValue + " + " + delta + " == " + newValue);
                }
            },
            {
                blockType : "delete_of",
                description : "Delete the item at the given index (1-based), the last item (pass in the word 'last'), or " +
                    "all items (pass in the word 'all') of the specified list depending on the option selected.",
                parameterInfo : [
                    { name : "what" },
                    { name : "listVariable" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var what = context.blockScript.nextArgument();
                    var listVariable = context.blockScript.nextArgument();
                    
                    var list = null;
                    if (resource.resourceType === "sprite" && resource.hasListVariable(listVariable)) {
                        var sprite = resource;
                        list = sprite.getListVariable(listVariable);
                    } else if (ScratchPod_this.hasListVariable(listVariable)) {
                        list = ScratchPod_this.getListVariable(listVariable);
                    } else {
                        throw new Error("List variable '" + listVariable + "' is not defined.");
                    }
                    if (list !== null) {
                        if (what === "all") {
                            list.deleteAll();
                        } else if (what === "last") {
                            if (list.length() > 0) {
                                list.deleteAt(list.length() - 1);
                            }
                        } else {
                            var index = Number(what) - 1;
                            if (index >= 0 && index <= list.length()) {
                                list.deleteAt(index);
                            }
                        }
                    }
                    context.blockScript.nextBlock();
                    console.log("delete_of " + what + " " + listVariable);
                }
            },
            {
                blockType : "hide_list",
                description : "Hides the specified list variable's Stage monitor.",
                parameterInfo : [
                    { name : "listVariable" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var listVariable = context.blockScript.nextArgument();
                    
                    if (resource.resourceType === "sprite" && resource.hasListVariable(listVariable)) {
                        var sprite = resource;
                        sprite.showListVariable(listVariable, false);
                    } else if (ScratchPod_this.hasListVariable(listVariable)) {
                        ScratchPod_this.showListVariable(listVariable, false);
                    } else {
                        throw new Error("List variable '" + listVariable + "' is not defined.");
                    }
                    context.blockScript.nextBlock();
                    console.log("hide_list " + listVariable);
                }
            },
            {
                blockType : "hide_variable",
                description : "Hides the specified variable's Stage monitor.",
                parameterInfo : [
                    { name : "variable" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var variable = context.blockScript.nextArgument();
                    
                    if (resource.resourceType === "sprite" && resource.hasVariable(variable)) {
                        var sprite = resource;
                        sprite.showVariable(variable, false);
                    } else if (ScratchPod_this.hasVariable(variable)) {
                        ScratchPod_this.showVariable(variable, false);
                    } else {
                        throw new Error("Variable '" + variable + "' is not defined.");
                    }
                    context.blockScript.nextBlock();
                    console.log("hide_variable " + variable);
                }
            },
            {
                blockType : "item_of",
                description : "Reports the contents of the specified item on a list. Pass a 1-based number or the string " +
                    "'last' to get the value of the last item or 'random' to get the value of a random item.",
                parameterInfo : [
                    { name : "what" },
                    { name : "listVariable" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var what = context.blockScript.nextArgument();
                    var listVariable = context.blockScript.nextArgument();
                    
                    var list;
                    if (resource.resourceType === "sprite" && resource.hasListVariable(listVariable)) {
                        var sprite = resource;
                        list = sprite.getListVariable(listVariable);
                    } else if (ScratchPod_this.hasListVariable(listVariable)) {
                        list = ScratchPod_this.getListVariable(listVariable);
                    } else {
                        throw new Error("List variable '" + listVariable + "' is not defined.");
                    }
                    
                    var result;
                    if (what === "last") {
                        result = list.getAt(list.length() - 1);
                    } else if (what === "random") {
                        var index = Math.floor(Math.random() * list.length());
                        result = list.getAt(index);
                    } else {
                        var index = Number(what) - 1;
                        result = list.getAt(index);
                    }
                    
                    console.log("item_of " + what + " " + listVariable + " == " + result);
                    return result;
                }
            },
            {
                blockType : "length_of",
                description : "Reports how many items a list contains",
                parameterInfo : [
                    { name : "listVariable" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var listVariable = context.blockScript.nextArgument();
                    
                    var result;
                    if (resource.resourceType === "sprite" && resource.hasListVariable(listVariable)) {
                        var sprite = resource;
                        result = sprite.getListVariable(listVariable).length();
                    } else if (ScratchPod_this.hasListVariable(listVariable)) {
                        result = ScratchPod_this.getListVariable(listVariable).length();
                    } else {
                        throw new Error("List variable '" + listVariable + "' is not defined.");
                    }
                    console.log("length_of " + listVariable + " == " + result);
                    return result;
                }
            },
            {
                blockType : "set_to",
                description : "The block will set the specified variable to the given value: a string or number",
                parameterInfo : [
                    { name : "variable" },
                    { name : "value" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var variable = context.blockScript.nextArgument();
                    var value = context.blockScript.nextArgument();
                    
                    if (resource.resourceType === "sprite" && resource.hasVariable(variable)) {
                        var sprite = resource;
                        sprite.setVariable(variable, value);
                    } else if (ScratchPod_this.hasVariable(variable)) {
                        ScratchPod_this.setVariable(variable, value);
                    } else {
                        throw new Error("Variable '" + variable + "' is not defined.");
                    }
                    context.blockScript.nextBlock();
                    console.log("set_to " + variable + " '" + value + "'");
                }
            },
            {
                blockType : "show_list",
                description : "Shows the specified list's Stage monitor.",
                parameterInfo : [
                    { name : "listVariable" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var variable = context.blockScript.nextArgument();
                    
                    if (resource.resourceType === "sprite" && resource.hasListVariable(variable)) {
                        var sprite = resource;
                        sprite.showListVariable(variable, true);
                    } else if (ScratchPod_this.hasListVariable(variable)) {
                        ScratchPod_this.showListVariable(variable, true);
                    } else {
                        throw new Error("List variable '" + variable + "' is not defined.");
                    }
                    context.blockScript.nextBlock();
                    console.log("show_list " + variable);
                }
            },
            {
                blockType : "show_variable",
                description : "Shows the specified variable's Stage monitor.",
                parameterInfo : [
                    { name : "variable" }
                ],
                returnsValue : false,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var resource = context.resource;
                    var variable = context.blockScript.nextArgument();
                    
                    if (resource.resourceType === "sprite" && resource.hasVariable(variable)) {
                        var sprite = resource;
                        sprite.showVariable(variable, true);
                    } else if (ScratchPod_this.hasVariable(variable)) {
                        ScratchPod_this.showVariable(variable, true);
                    } else {
                        throw new Error("Variable '" + variable + "' is not defined.");
                    }
                    context.blockScript.nextBlock();
                    console.log("show_variable " + variable);
                }
            },
            {
                blockType : "variable",
                description : "Returns the value of the variable with the provided name.",
                parameterInfo : [
                    { name : "variable" }
                ],
                returnsValue : true,
                compatibleWith : function(resource) {
                    return resource.resourceType === "sprite" || resource.resourceType === "stage";
                },
                tick : function(context) {
                    var result;
                    var resource = context.resource;
                    var variable = context.blockScript.nextArgument();
                    
                    if (resource.resourceType === "sprite" && resource.hasVariable(variable)) {
                        var sprite = resource;
                        result = sprite.getVariable(variable);
                    } else if (ScratchPod_this.hasVariable(variable)) {
                        result = ScratchPod_this.getVariable(variable);
                    } else {
                        throw new Error("Variable '" + variable + "' is not defined.");
                    }
                    console.log("variable " + variable + " == " + result);
                    return result;
                }
            }
            
        ];
    };

    /**
     * Part of the Pod standard interface - return information about the resources provided
     * by the scratch pod.
     *
     * @public
     * @instance
     * @method getResourceTypes
     * @memberof PodJS.ScratchPod
     * @return {object[]} One info object for each resource.
     */
    this.getResourceTypes = function() {
        return [
            {
                resourceType : "sprite"
            },
            {
                resourceType : "stage"
            }
        ];
    };

    /**
     * @private
     * @instance
     * @class AudioFeature
     * @classdesc Equips a resource with the capability to play audio. Each AudioFeature can only play one sound at a time and
     *     handles loading, playing and stopping of the audio.
     *     
     * @param {string} prefix The prefix to use to keep audio resources unique.
     */
    var AudioFeature = function(prefix) {
        var AudioFeature_this = this;

        // Sound currently being played
        var _currentSound = null;
        
        /**
         * True if the sound for this sprite / stage is done playing, or false if actively playing.
         *
         * @member
         * @memberof PodJS.ScratchPod.AudioFeature
         */
        this.soundComplete = true;
        
        this.loadSound = function(name, src) {
            var audioId = prefix + "::" + name;
            if (_audioFiles.hasOwnProperty(audioId)) {
                throw new Error("Already have a sound resource called '" + name + "'");
            }
            var audioInfo = Object.create(AudioInfo);
            audioInfo.prefix = prefix;
            audioInfo.name = name;
            var audioSrc = _resourcesPathPrefix + src;
            // Add .ogg version of sound as well, for Firefox
            var mp3Index = src.indexOf(".mp3");
            if (mp3Index !== -1) {
                audioSrc += "|" + _resourcesPathPrefix + src.substring(0, mp3Index) + ".ogg";
            }
            audioInfo.src = audioSrc;
            console.log(audioSrc);
            _audioFiles[audioId] = audioInfo;
            createjs.Sound.registerSound(audioInfo.src, audioId);
        };
        
        var _handleComplete = function(event) {
            this.soundComplete = true;
        };
        
        this.playSound = function(name) {
            var audioId = prefix + "::" + name;
            this.stopAllSounds();
            if (_audioFiles.hasOwnProperty(audioId) && _audioFiles[audioId].loaded) {
                this.soundComplete = false;
                _currentSound = createjs.Sound.play(audioId);
                _currentSound.addEventListener("complete", createjs.proxy(_handleComplete, AudioFeature_this));
            } else {
                console.log("Warning: Sound '" + audioId + "' not loaded yet, so not playing.");
            }
        };

        this.stopAllSounds = function() {
            if (_currentSound !== null) {
                _currentSound.stop();
                _currentSound.removeAllEventListeners();
                _currentSound = null;
                this.soundComplete = true;
            }
        };
    };

    /**
     * Internal factory method for new Sprite class instances.
     *
     * @private
     * @instance
     * @method createSprite
     * @param parentObject The resource super-object from PodJS
     * @param spriteName The name of the sprite
     * @return A new Sprite instance
     */
    var createSprite = function(parentObject, spriteName) {
        // Private Costume class
        var Costume = function(src, scale) {
            scale = scale || 1.0;
            var _easelBitmap;

            this.getEaselBitmap = function() {
                return _easelBitmap;
            };

            var construct = function() {
                var img = new Image();
                img.onload = function() {
                    _easelBitmap.x = -img.width * _easelBitmap.scaleX / 2;
                    _easelBitmap.y = -img.height * _easelBitmap.scaleY / 2;
                };
                img.src = src;
                _easelBitmap = new createjs.Bitmap(img);
                _easelBitmap.scaleX = scale;
                _easelBitmap.scaleY = scale;
            };
            construct();
        };
        
        /**
         * @class PodJS.ScratchPod.Sprite
         * @classdesc Model for the Scratch Sprite class
         */
        var Sprite = function(spriteName) {
            var Sprite_this = this;
            var _costumes = {};
            var _variables = {};
            var _listVariables = {};
            var _currentCostume = null;
            var _show = true;
            var _x = 0;
            var _y = 0;
            var _direction = 90;
            var _audio = new AudioFeature(spriteName);
            
            /**
             * Converts direction (which is in Scratch format, 0 = up, -90 = left, 90 = right, 180 = down) to normalized
             * degrees (0 = right, 90 = up, 180 = left, 270 = down).
             */
            var _normalizedDirection = function() {
                return ((-_direction) + 90 + 360) % 360;
            };
            
            /**
             * The last time this Sprite was clicked, or 0 if never clicked, in millis since epoch.
             * 
             * @instance
             * @member {number} lastClickTime
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.lastClickTime = 0;

            /**
             * Create a new variable with the given name.
             * 
             * @instance
             * @method createVariable
             * @param {string} name the name of the variable
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.createVariable = function(name) {
                if (_variables.hasOwnProperty(name)) {
                    throw "Sprite already has a variable called '" + name + "'";
                }
                var variable = new Variable(spriteName, name);
                _autoPositionVariable(variable);
                _variables[name] = variable;
                return this;
            };

            /**
             * Create a new list variable with the given name.
             * 
             * @instance
             * @method createListVariable
             * @param {string} name the name of the list variable
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.createListVariable = function(name) {
                if (_listVariables.hasOwnProperty(name)) {
                    throw "Sprite already has a list variable called '" + name + "'";
                }
                var listVariable = new ScratchPod_this.ListVariable(spriteName, name);
                _autoPositionListVariable(listVariable);
                _listVariables[name] = listVariable;
                return this;
            };

            /**
             * Set the value of the given variable to the given value.
             * 
             * @instance
             * @method setVariable
             * @param {string} name the name of the variable
             * @param {number|string} value the value to set the variable to
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.setVariable = function(name, value) {
                if (!_variables.hasOwnProperty(name)) {
                    throw "Sprite does not have a variable called '" + name + "'";
                }
                _variables[name].value = value;
                return this;
            };

            /**
             * Get the value of the given variable.
             * 
             * @instance
             * @method getVariable
             * @param {string} name the name of the variable
             * @return The value of the variable.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.getVariable = function(name) {
                if (!_variables.hasOwnProperty(name)) {
                    throw "Sprite does not have a variable called '" + name + "'";
                }
                return _variables[name].value;
            };

            /**
             * Get the given list variable.
             * 
             * @instance
             * @method getListVariable
             * @param {string} name the name of the list variable
             * @return The list variable.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.getListVariable = function(name) {
                if (!_listVariables.hasOwnProperty(name)) {
                    throw "Sprite does not have a list variable called '" + name + "'";
                }
                return _listVariables[name];
            };

            /**
             * Returns the names of all the variables for this sprite.
             * 
             * @instance
             * @method getVariableNames
             * @return {string[]} The names of all the variables
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.getVariableNames = function() {
                var result = [];
                for (var name in _variables) {
                    if (_variables.hasOwnProperty(name)) {
                        result.push(name);
                    }
                }
                return result;
            };

            /**
             * Returns true if the variable exists for this sprite, or false if not.
             * 
             * @instance
             * @method hasVariable
             * @param {string} name the name of the variable
             * @return {boolean} true if the variable exists or false if not.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.hasVariable = function(name) {
                return _variables.hasOwnProperty(name);
            };

            /**
             * Returns true if the list variable exists for this sprite, or false if not.
             * 
             * @instance
             * @method hasListVariable
             * @param {string} name the name of the list variable
             * @return {boolean} true if the list variable exists or false if not.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.hasListVariable = function(name) {
                return _listVariables.hasOwnProperty(name);
            };

            /**
             * Sets whether this variable is shown on the stage, and the location at which it is shown.
             * 
             * @instance
             * @method showVariable
             * @param {string} name the name of the variable
             * @param {boolean} shown true if the variable is to be shown, or false if not. Optional, defaults to true.
             * @param {number} x x position of the variable on the stage (optional, defaults to 0)
             * @param {number} y y position of the variable on the stage (optional, defaults to 0)
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.showVariable = function(name, shown, x, y) {
                if (typeof(shown) === "undefined") {
                    shown = true;
                }
                if (typeof(x) !== "undefined") {
                    _variables[name].x = x;
                }
                if (typeof(y) !== "undefined") {
                    _variables[name].y = y;
                }
                if (!_variables.hasOwnProperty(name)) {
                    throw "Sprite does not have a variable called '" + name + "'";
                }
                _variables[name].shown = shown;
                return this;
            };

            /**
             * Sets whether this list variable is shown on the stage, and the location at which it is shown.
             * 
             * @instance
             * @method showListVariable
             * @param {string} name the name of the list variable
             * @param {boolean} shown true if the list variable is to be shown, or false if not. Optional, defaults to true.
             * @param {number} x x position of the list variable on the stage (optional, defaults to 0)
             * @param {number} y y position of the list variable on the stage (optional, defaults to 0)
             * @param {number} width width Width of the box to show (optional, defaults to enough width to show small ints)
             * @param {number} height height of the box to show (optional, defaults to 8 rows worth of pixels)
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.showListVariable = function(name, shown, x, y, width, height) {
                if (typeof(shown) === "undefined") {
                    shown = true;
                }
                if (typeof(x) !== "undefined" && x !== null) {
                    _listVariables[name].x = x;
                }
                if (typeof(y) !== "undefined" && y !== null) {
                    _listVariables[name].y = y;
                }
                if (typeof(width) !== "undefined") {
                    _listVariables[name].width = width;
                }
                if (typeof(height) !== "undefined") {
                    _listVariables[name].height = height;
                }
                if (!_listVariables.hasOwnProperty(name)) {
                    throw "Sprite does not have a list variable called '" + name + "'";
                }
                _listVariables[name].shown = shown;
                return this;
            };

            /**
             * Load and register a new costume for this sprite.
             * 
             * @instance
             * @method loadCostume
             * @param {string} name the name of the costume
             * @param {string} src the href of where to find the image of the costume.
             * @param {number} scale (optional) - if specified, scale the image up or down by this amount, defaults to 1.0.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.loadCostume = function(name, src, scale) {
                scale = scale || 1.0;
                if (_costumes.hasOwnProperty(name)) {
                    throw "Sprite already has a costume called '" + name + "'";
                }
                var costume = new Costume(_resourcesPathPrefix + src, scale);
                var bitmap = costume.getEaselBitmap();
                bitmap.addEventListener("click", function(event) {
                    Sprite_this.lastClickTime = Date.now();
                });
                _costumes[name] = costume;
                if (_currentCostume === null) {
                    this.setCostume(name);
                }
                return this;
            };

            /**
             * Load and register an audio file for this sprite.
             * 
             * @instance
             * @method loadSound
             * @param {string} name the name of the audio
             * @param {string} src the href of where to find the audio file.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.loadSound = function(name, src) {
                _audio.loadSound(name, src);
                return this;
            };
            
            /**
             * Stop playing any sounds and play a new sound.
             * 
             * @instance
             * @method playSound
             * @param {string} name the id of the sound to play
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.playSound = function(name) {
                _audio.playSound(name);
                return this;
            };
            
            /**
             * Stop playing any sounds for this sprite.
             * 
             * @instance
             * @method stopAllSounds
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.stopAllSounds = function() {
                _audio.stopAllSounds();
                return this;
            };

            /**
             * Change costume for this Sprite
             * 
             * @instance
             * @method setCostume
             * @param {string} name the name of the costume to change into, matching the name
             *     provided to loadCostume.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.setCostume = function(name) {
                if (!_costumes.hasOwnProperty(name)) {
                    throw "Sprite does not have a costume called '" + name + "'";
                }
                if (name !== _currentCostume) {
                    var index = -1;
                    if (_currentCostume !== null) {
                        // Remove from stage
                        var easelBitmap = _costumes[_currentCostume].getEaselBitmap();
                        index = _easelStage.getChildIndex(easelBitmap);
                        if (index !== -1) {
                            // Unfortuantely, there's no replaceAt, so we remove and re-add at a cost of 2n.
                            _easelStage.removeChildAt(index);
                        }
                    }
                    var newCostume = _costumes[name];
                    var newBitmap = newCostume.getEaselBitmap();
                    newBitmap.visible = _show;
                    if (index !== -1) {
                        // Keep the same index
                        _easelStage.addChildAt(newBitmap, index);
                    } else {
                        _easelStage.addChild(newBitmap);
                    }
                    _currentCostume = name;
                }
                return this;
            };

            /**
             * Return the currently active costume object for this Sprite
             * <p>
             * This method is intended for internal use and may change in the future.
             *
             * @instance
             * @method _getCurrentCostumeObject
             * @return {PodJS.ScratchPod.Costume}
             * @memberof PodJS.ScratchPod.Sprite
             */
            this._getCurrentCostumeObject = function() {
                return _costumes[_currentCostume];
            };

            /**
             * Changes whether this sprite is being shown or not.
             * 
             * @instance
             * @method setShown
             * @param {boolean} show true if this is to be shown or false if not.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.setShown = function(show) {
                _show = show;
                if (_currentCostume !== null) {
                    var costume = _costumes[_currentCostume];
                    var easelBitmap = costume.getEaselBitmap();
                    easelBitmap.visible = show;
                }
                return this;
            };

            /**
             * Shortcut for setShown(false)
             * 
             * @instance
             * @method hide
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.hide = function() {
                return this.setShown(false);
            };

            /**
             * Shortcut for setShown(true)
             * 
             * @instance
             * @method show
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.show = function() {
                return this.setShown(true);
            };

            /**
             * Returns whether this sprite is being shown or not.
             * 
             * @instance
             * @method isShown
             * @return {boolean} true if this is to be shown or false if not.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.isShown = function() {
                return _show;
            };

            /**
             * Gets called periodically by the environment when the next action is to take place.
             *
             * @method tick
             * @memberof PodJS.ScratchPod.Sprite
             * @instance
             */
            this.tick = function() {
                // Update appearance of Sprite on the easel
                if (_currentCostume !== null) {
                    var costume = _costumes[_currentCostume];
                    var bitmap = costume.getEaselBitmap();
                    bitmap.show = _show;
                    bitmap.regX = Math.floor(bitmap.image.width / 2);
                    bitmap.regY = Math.floor(bitmap.image.height / 2);
                    bitmap.x = _x;
                    bitmap.y = -_y;
                    bitmap.rotation = _normalizedDirection();
                }
            };

            /**
             * Move this sprite the given number of steps.
             *
             * @method moveSteps
             * @param {number} steps The number of steps to move the Sprite, in the forward direction.
             * @memberof PodJS.ScratchPod.Sprite
             * @instance
             */
            this.moveSteps = function(steps) {
                var rad = _normalizedDirection() * Math.PI / 180;
                var dx = Math.cos(rad);
                var dy = Math.sin(rad);
                _x += dx * steps;
                _y -= dy * steps;
                return this;
            };

            /**
             * Move this sprite the given number of steps in the X and Y directions.
             *
             * @method translate
             * @param {number} x The number of steps to move the Sprite, in the x direction.
             * @param {number} y The number of steps to move the Sprite, in the y direction.
             * @memberof PodJS.ScratchPod.Sprite
             * @instance
             */
            this.translate = function(x, y) {
                _x += x;
                _y += y;
                return this;
            };

            /**
             * Returns the current direction of the sprite, in degrees normalized to 0 (inclusive) to 360 (exclusive).
             *
             * @method getDirection
             * @memberof PodJS.ScratchPod.Sprite
             * @instance
             */
            this.getDirection = function() {
                return _direction;
            };

            /**
             * Point this sprite in the direction given
             *
             * @method setDirection
             * @param {number} degrees The number of steps to move the Sprite, in the x direction.
             * @memberof PodJS.ScratchPod.Sprite
             * @instance
             */
            this.setDirection = function(degrees) {
                _direction = degrees;
                return this;
            };

            /**
             * Sets the sprite's X and Y position to the specified amounts.
             *
             * @method go_xy
             * @param {number} x The x position, in pixels.
             * @param {number} y The y position, in pixels.
             * @memberof PodJS.ScratchPod.Sprite
             * @instance
             */
            this.goXY = function(x, y) {
                _x = x;
                _y = y;
                return this;
            };
        };
        Sprite.prototype = parentObject;
        var result = new Sprite(spriteName);
        result.register(result);
        return result;
    };

    /**
     * Internal method to create the model class that controls the stage.
     * <p>
     * The interfaces to these classes are all internal - the official public way to access these classes
     * is through the blocks returned by this pod.
     *
     * @private
     * @instance
     * @method createStage
     * @param parentObject The resource super-object from PodJS
     * @memberOf PodJS.ScratchPod
     */
    var createStage = function(parentObject) {
        // Private Backdrop class
        var Backdrop = function(src) {
            var _easelBitmap;

            this.getEaselBitmap = function() {
                return _easelBitmap;
            };

            var construct = function() {
                var img = new Image();
                img.onload = function() {
                    _easelBitmap.setTransform(-img.width / 2, -img.height / 2);
                };
                img.src = src;
                _easelBitmap = new createjs.Bitmap(img);
            };
            construct();
        };

        // Private Stage class
        var Stage = function() {
            var _currentBackdrop = null;
            var _audio = new AudioFeature("");

            var _backdrops = {};

            this.loadBackdrop = function(name, src) {
                if (_backdrops.hasOwnProperty(name)) {
                    throw "Stage already has a backdrop called '" + name + "'";
                }
                _backdrops[name] = new Backdrop(_resourcesPathPrefix + src);
                return this;
            };

            this.switchBackdrop = function(name) {
                // Assert that the backdrop with the given name exists
                var newBackdrop = _backdrops[name];
                if (typeof(newBackdrop) === "undefined") {
                    throw "Stage does not contain a backdrop with name '" + name + "'";
                }
                var newBitmap = newBackdrop.getEaselBitmap();

                // Remove previous bitmap from stage (backdrop bitmap is always at index 0)
                if (_easelStage.getNumChildren() > 0) {
                    _easelStage.removeChildAt(0);
                }

                // Add new bitmap to stage
                newBitmap.x = -_canvas.width / 2;
                newBitmap.y = -_canvas.height / 2;
                _easelStage.addChildAt(newBitmap, 0);
                _easelStage.update();

                _currentBackdrop = newBackdrop;
                return this;
            };

            /**
             * Load and register an audio file for the stage.
             * 
             * @instance
             * @method loadSound
             * @param {string} name the name of the audio
             * @param {string} src the href of where to find the audio file.
             * @memberof PodJS.ScratchPod.Stage
             */
            this.loadSound = function(name, src) {
                _audio.loadSound(name, src);
                return this;
            };
            
            /**
             * Stop playing any sounds for the stage and play a new sound.
             * 
             * @instance
             * @method playSound
             * @param {string} name the id of the sound to play
             * @memberof PodJS.ScratchPod.Stage
             */
            this.playSound = function(name) {
                _audio.playSound(name);
                return this;
            };
            
            /**
             * Stop playing any sounds for the stage.
             * 
             * @instance
             * @method stopAllSounds
             * @memberof PodJS.ScratchPod.Stage
             */
            this.stopAllSounds = function() {
                _audio.stopAllSounds();
                return this;
            };
        };
        Stage.prototype = parentObject;
        var result = new Stage();
        
        // Set default backdrop:
        result.loadBackdrop("backdrop1", "img/blank.png");
        result.switchBackdrop("backdrop1");
        
        // Complete registration
        result.register(result);
        return result;
    };

    /**
     * Part of the Pod standard interface - called when the environment or an application wishes to create a
     * new resource of the given type.
     *
     * @method newResource
     * @memberof PodJS.ScratchPod
     * @instance
     * @param {string} resourceType The type of resource to be created (e.g. "sprite"). Must be one of the resource types
     *     returned by {@link getResourceTypes}.
     * @param {string} resourceName The name of the resource to create. This name must be unique for the type of resource so that
     *     the resource can be later retrieved and, if necessary, deleted.
     * @param {object} [options] Set of parameters to be used when creating the resource.
     * @returns {PodJS.Pod#Resource} Returns the instance of the resource.
     * @throws {Error} If the resource type provided was not valid. This checking is handled by {@link PodJS.Pod#newResourceClass}.
     * @throws {Error} If a resource of this type already exists with the given name. This checking is handled by
     *     {@link PodJS.Pod#newResourceClass}.
     */
    this.newResource = function(resourceType, resourceName, options) {
        var result;
        var resourceBase = this.newResourceClass(resourceType, resourceName, options);
        var resource = Object.create(resourceBase);
        
        if (resourceType === "sprite") {
            result = createSprite(resource, resourceName);
        } else if (resourceType === "stage") {
            result = createStage(resource);
        } else {
            result = resource;
        }
        
        return result;
    };

    /**
     * Convenience method to create a new sprite resource.
     *
     * @method newSprite
     * @memberof PodJS.ScratchPod
     * @instance
     * @param {string} name The name of the sprite to create. This name must be unique for all sprites.
     * @returns {PodJS.ScratchPod.Sprite} Returns the instance of the Sprite.
     * @throws {Error} If a resource of this type already exists with the given name. This checking is handled by
     *     {@link PodJS.Pod#newResourceClass}.
     */
    this.newSprite = function(name) {
        return this.newResource("sprite", name);
    };

    /**
     * Part of the Pod standard interface - called when a {@link PodJS.ScriptBuilder} wishes to create a
     * new instance of a block.
     *
     * @method newBlock
     * @memberof PodJS.ScratchPod
     * @instance
     * @param {string} blockType The type of block to be created (e.g. "gotoXY"). Must be one of the block types
     *     returned by {@link PodJS.Pod#getBlockTypes}.
     * @param {PodJS.Block#Resource} resource The resource this block is to be bound to.
     * @param {PodJS.Script} script The script this block is bound to.
     * @returns {PodJS.Pod#Block} The instance of the block.
     * @throws {Error} If the block type provided was not one of the valid block types returned by {@link PodJS.Pod#getBlockTypes}.
     *     This check is performed by {@link PodJS.Pod#newBlockClass}.
     * @throws {Error} If the block to be returned would not be compatible with the resource provided. This check
     *     must be performed by the subclass.
     */
    this.newBlock = function(blockType, resource, script) {
        var blockClass = this.newBlockClass(blockType, resource, script);
        var block = Object.create(blockClass);
        return block;
    };
    
    /**
     * Returns the stage.
     * 
     * @method getStage
     * @memberof PodJS.ScratchPod
     * @instance
     * @returns {PodJS.ScratchPod.Stage} The stage
     */
    this.getStage = function() {
        return _stage;
    };
    
    /**
     * Stop playing all sounds being played by scratch resources.
     * 
     * @method stopAllSounds
     * @memberof PodJS.ScratchPod
     * @instance
     */
    this.stopAllSounds = function() {
        var resources = ScratchPod_this.getAllResources()
        for (var resType in resources) {
            if (resources.hasOwnProperty(resType)) {
                var resourceByType = resources[resType];
                for (var resName in resourceByType) {
                    if (resourceByType.hasOwnProperty(resName)) {
                        var resource = resourceByType[resName];
                        if (resource.hasOwnProperty("stopAllSounds")) {
                            resource.stopAllSounds();
                        }
                    }
                }
            }
        }
    };
    
    /**
     * Sets the directory that all resources are relative to.
     * 
     * @method resourcesPath
     * @memberof PodJS.ScratchPod
     * @param {string} path The path prefix for all resources loaded by this pod. If it does not end in '/', a '/' will be added.
     * @instance
     */
    this.setResourcesPath = function(path) {
        if (path.charAt(path.length - 1) !== '/') {
            path += '/';
        }
        _resourcesPathPrefix = path;
        return ScratchPod_this;
    };

    /**
     * Internal method to find the div, attach the canvas, and initialize createjs' easel.
     *
     * @private
     * @instance
     * @method attachToDiv
     * @memberOf PodJS.ScratchPod
     */
    var attachToDiv = function() {
        var style = document.createElement("style");
        style.innerHTML = "\n\
.podjs_scratch_list_var { \n\
    z-index: 100; \n\
    padding: 2px 6px; \n\
    border: 1px solid #949191; \n\
    background: #c1c4c7; \n\
    font-weight: bold; \n\
    font-family: sans-serif; \n\
    border-radius: 4px; \n\
    font-size: 10pt; \n\
    visibility: hidden; \n\
    height: 185px;\n\
} \n\
.podjs_scratch_list_value_div {\n\
    height: calc(100% - 45px); \n\
    overflow-y: auto; \n\
    padding-right: 16px; \n\
    margin-top: 10px;\n\
    min-width: 100px;\n\
}\n\
.podjs_scratch_list_var_list { \n\
    padding-left: 0px;\n\
    margin: 0px; \n\
    list-style-type: decimal; \n\
} \n\
.podjs_scratch_list_var_item { \n\
    margin-left: 30px; \n\
    color: #000000; \n\
    padding: 0px 4px; \n\
} \n\
.podjs_scratch_list_var_item_span { \n\
    background: #ee7d16; \n\
    color: #ffffff; \n\
    min-width: 34px; \n\
    padding: 0px 4px; \n\
    border: 1px solid #ffffff; \n\
    border-radius: 4px; \n\
    text-align: left; \n\
    display: block; \n\
} \n\
.podjs_scratch_list_var_length_div { \n\
    font-weight: normal;\n\
    margin-top: 5px;\n\
} \n\
.podjs_scratch_var_div { \n\
    z-index: 100; \n\
    padding: 2px 6px; \n\
    border: 1px solid #949191; \n\
    background: #c1c4c7; \n\
    font-weight: bold; \n\
    font-family: sans-serif; \n\
    border-radius: 4px; \n\
    font-size: 10pt; \n\
    visibility: hidden; \n\
} \n\
.podjs_scratch_var_value { \n\
    margin-left: 6px; \n\
    background: #ee7d16; \n\
    color: #ffffff; \n\
    min-width: 34px; \n\
    padding: 0px 4px; \n\
    border: 1px solid #ffffff; \n\
    border-radius: 4px; \n\
    float: right; \n\
    text-align: center; \n\
} \n\
";
        document.head.appendChild(style);
        
        var divId = options.scratch_stage_div;
        if (typeof(divId) === "undefined") {
            divId = "stage";
        }
        _div = document.getElementById(divId);
        if (_div === null) {
            throw new Error("Could not find div with id '" + divId + "' to bind scratch stage to.");
        }
        _div.innerHTML = "";
        
        var gradientCss = "background: #e6e8e8; \
            background: -moz-linear-gradient(top, #ffffff 0%, #e6e8e8 100%); /* FF3.6+ */ \
            background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#ffffff), color-stop(100%,#e6e8e8)); /* Chrome,Safari4+ */ \
            background: -webkit-linear-gradient(top, #ffffff 0%,#e6e8e8 100%); /* Chrome10+,Safari5.1+ */ \
            background: -o-linear-gradient(top, #ffffff 0%,#e6e8e8 100%); /* Opera 11.10+ */ \
            background: -ms-linear-gradient(top, #ffffff 0%,#e6e8e8 100%); /* IE10+ */ \
            background: linear-gradient(top,  #ffffff 0%,#e6e8e8 100%); /* W3C */ \
            filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#ffffff', endColorstr='#e6e8e8',GradientType=0 ); /* IE6-9 */";
        _controlsDiv = document.createElement("div");
        _controlsDiv.setAttribute("style", "height: 32px; width: 100%; " + gradientCss);
        
        _redStopButton = document.createElement("img");
        _redStopButton.setAttribute("style", "width: 24px; height: 24px; float: right; margin-top: 4px; margin-right: 8px;");
        _redStopButton.onmouseover = function() { this.src='img/red_stop_on.png'; };
        _redStopButton.onmouseout = function() {
            if (_running) {
                this.src='img/red_stop_off.png';
            } else {
                this.src='img/red_stop_on.png';
            }
        };
        _redStopButton.onclick = function() {
            _running = false;
            _lastGreenFlagClickTime = 0;
            _env.resetAllScripts();
            _redStopButton.onmouseout();
            _greenFlagButton.onmouseout();
            ScratchPod_this.stopAllSounds();
        };
        _redStopButton.onmouseout();
        _controlsDiv.appendChild(_redStopButton);
        
        _greenFlagButton = document.createElement("img");
        _greenFlagButton.setAttribute("style", "width: 24px; height: 24px; float: right; margin-top: 4px; margin-right: 8px;");
        _greenFlagButton.onmouseover = function() { this.src='img/green_flag_on.png'; };
        _greenFlagButton.onmouseout = function() {
            if (_running) {
                this.src='img/green_flag_on.png';
            } else {
                this.src='img/green_flag_off.png';
            }
        };
        _greenFlagButton.onclick = function() {
            _running = true;
            _lastGreenFlagClickTime = Date.now();
            _env.resetAllScripts();
            _redStopButton.onmouseout();
            _greenFlagButton.onmouseout();
        };
        _greenFlagButton.onmouseout();
        _controlsDiv.appendChild(_greenFlagButton);
        
        _stageDiv = document.createElement("div");
        _stageDiv.setAttribute("style", "height: " + (_div.offsetHeight - 34) + "px; width: 100%;");
        _div.appendChild(_controlsDiv);
        _div.appendChild(_stageDiv);

        // Add canvas to _stageDiv
        _canvas.style.width = "100%";
        _canvas.style.height = "100%";
        _canvas.width = _stageDiv.offsetWidth;
        _canvas.height = _stageDiv.offsetHeight;
        _stageDiv.appendChild(_canvas);
        
        // Attach createjs to canvas
        _easelStage = new createjs.Stage(_canvas);
        _easelStage.setTransform(_canvas.width / 2, _canvas.height / 2);
    };

    /**
     * Gets called periodically by the environment when the next action is to take place. This is part of the standard PodJS
     * interface.
     *
     * @method tick
     * @memberof PodJS.Pod
     * @instance
     */
    this.tick = function() {
        if (_easelStage !== null) {
            _easelStage.update();
        }

        // TODO: This can be made much more efficient
        // Update running status: check if all scripts are at the beginning. If so, virtually click stop.
        var allScriptsAtZero = true;
        var resources = this.getAllResources();
        for (var resType in resources) {
            if (resources.hasOwnProperty(resType)) {
                var resourceByType = resources[resType];
                for (var resName in resourceByType) {
                    if (resourceByType.hasOwnProperty(resName)) {
                        var resource = resourceByType[resName];
                        var scripts = resource.scripts;
                        for (var i = 0; i < scripts.length; i++) {
                            var script = scripts[i];
                            if (script.index !== 0) {
                                allScriptsAtZero = false;
                            }
                        }
                    }
                }
            }
        }
        if (allScriptsAtZero) {
            if (_running) {
                _running = false;
                _redStopButton.onmouseout();
                _greenFlagButton.onmouseout();
            }
        } else {
            if (!_running) {
                _running = true;
                _redStopButton.onmouseout();
                _greenFlagButton.onmouseout();
            }
        }
    };

    var _audioLoadHandler = function(event) {
        var audioId = event.id;
        if (_audioFiles.hasOwnProperty(audioId)) {
            var info = _audioFiles[audioId];
            info.loaded = true;
        }
    };

    var _initializeAudio = function() {
        // TODO: Initialize audio once the user touches, so this works on mobile devices.
        // See http://www.createjs.com/tutorials/Mobile%20Safe%20Approach/
        if (!createjs.Sound.initializeDefaultPlugins()) {
            console.log("Could not initialize SoundJS. Audio may not work correctly.");
        } else {
            createjs.Sound.addEventListener("fileload", createjs.proxy(_audioLoadHandler, ScratchPod_this));
        }
    };

    var construct = function() {
        // Ensure createjs is loaded:
        if (typeof(createjs) === "undefined") {
            throw new Error("You must add <script src='js/createjs-2013.09.25.min.js'></script> " +
                "to your html for pod_scratch.js to work.");
        }
        
        // Find stage div and attach to it
        attachToDiv();
        
        // Initialize stage and add a default backdrop
        _stage = ScratchPod_this.newResource("stage", "stage");
        
        _initializeAudio();
    };
    construct();
};
PodJS.ScratchPod.prototype = Object.create(PodJS.Pod.prototype);
PodJS.ScratchPod.constructor = PodJS.ScratchPod;
PodJS.REGISTER_POD_CLASS("scratch", PodJS.ScratchPod);
