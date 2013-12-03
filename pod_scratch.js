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
            // EventBlocks
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
                    var lastGreenFlagClickTime = context.block.lastGreenFlagClickTime;
                    if (typeof(lastGreenFlagClickTime) === "undefined" || lastGreenFlagClickTime === null) {
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
                    var lastSpriteClickTime = context.block.lastSpriteClickTime;
                    if (typeof(lastSpriteClickTime) === "undefined" || lastSpriteClickTime === null) {
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
                    var endTime = context.block.endTime;
                    if (typeof(endTime) === "undefined" || endTime === null) {
                        console.log("wait");
                        var ip = context.blockScript.index;
                        var delay = context.blockScript.nextArgument();
                        context.block.nextIP = context.blockScript.index + 1;
                        context.blockScript.index = ip;
                        endTime = now + delay * 1000;
                        context.block.endTime = endTime;
                    }
                    if (now >= endTime) {
                        delete context.block.endTime;
                        context.blockScript.index = context.block.nextIP;
                        delete context.block.nextIP;
                    } else {
                        context.blockScript.yield = true;
                    }
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
     * Internal factory method for new Sprite class instances.
     *
     * @private
     * @instance
     * @method createSprite
     * @param parentObject The resource super-object from PodJS
     * @return A new Sprite instance
     */
    var createSprite = function(parentObject) {
        // Private Backdrop class
        var Costume = function(src) {
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
        
        /**
         * @class PodJS.ScratchPod.Sprite
         * @classdesc Model for the Scratch Sprite class
         */
        var Sprite = function() {
            var Sprite_this = this;
            var _costumes = {};
            var _currentCostume = null;
            var _show = true;
            var _x = 0;
            var _y = 0;
            
            /**
             * The last time this Sprite was clicked, or 0 if never clicked, in millis since epoch.
             * 
             * @instance
             * @member {number} lastClickTime
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.lastClickTime = 0;

            /**
             * Load and register a new costume for this sprite.
             * 
             * @instance
             * @method loadCostume
             * @param {string} name the name of the costume
             * @param {string} src the href of where to find the image of the costume.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.loadCostume = function(name, src) {
                if (_costumes.hasOwnProperty(name)) {
                    throw "Sprite already has a costume called '" + name + "'";
                }
                var costume = new Costume(src);
                var bitmap = costume.getEaselBitmap();
                bitmap.addEventListener("click", function(event) {
                    Sprite_this.lastClickTime = Date.now();
                });
                _costumes[name] = costume;
                if (_currentCostume === null) {
                    this.setCostume(name);
                }
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
            };

            /**
             * Changes whether this sprite is being shown or not.
             * 
             * @instance
             * @method setShown
             * @param {boolean} true if this is to be shown or false if not.
             * @memberof PodJS.ScratchPod.Sprite
             */
            this.setShown = function(show) {
                _show = show;
                if (_currentCostume !== null) {
                    var costume = _costumes[_currentCostume];
                    var easelBitmap = costume.getEaselBitmap();
                    easelBitmap.visible = show;
                }
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
                    bitmap.setTransform(
                        -bitmap.image.width / 2 + _x,
                        -bitmap.image.height / 2 + _y);
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
                //TODO: Move based on direction, not always to the right
                _x += steps;
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
            };
        };
        Sprite.prototype = parentObject;
        var result = new Sprite();
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

            var _backdrops = {};

            this.loadBackdrop = function(name, src) {
                if (_backdrops.hasOwnProperty(name)) {
                    throw "Stage already has a backdrop called '" + name + "'";
                }
                _backdrops[name] = new Backdrop(src);
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
            result = createSprite(resource);
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
     * Internal method to find the div, attach the canvas, and initialize createjs' easel.
     *
     * @private
     * @instance
     * @method attachToDiv
     * @memberOf PodJS.ScratchPod
     */
    var attachToDiv = function() {
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
    };
    construct();
};
PodJS.ScratchPod.prototype = Object.create(PodJS.Pod.prototype);
PodJS.ScratchPod.constructor = PodJS.ScratchPod;
PodJS.REGISTER_POD_CLASS("scratch", PodJS.ScratchPod);
