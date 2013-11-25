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

// Browser detect:
if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
   var ieversion = new Number(RegExp.$1);
   if (ieversion <= 8) {
       console.log("Sorry, this page requires Internet Explorer 9+, Chrome, or Firefox.");
   }
} else {

/**
 * @global
 * @class PodJS
 * @classdesc Main environment for <a href="http://podjs.com">pod.js</a>.
 *     <p>
 *     The class has a static registry of pod classes which have been loaded. Note that only one version of each Pod class can be
 *     registered globally per page. Pod classes get registered by their corresponding scripts, loaded by the html page.
 *     <p>
 *     Multiple PodJS environments can be created on the same page via instances of this class. Each instance has its own timer
 *     and its own instances of the registered pods, created lazily in dependency order when requested by the application.
 *     <p>
 *     The optional options object provided contains both environment settings and settings that are applicable to specific
 *     pods. Pods will consume only the options they care about.
 *     <p>
 *     Author: markroth8
 * 
 * @constructor
 * @desc Constructs a new PodJS environment with the given options.
 * @param {object} [options] An Object containing options for the environment. Parameters:
 *     <table>
 *       <tr>
 *         <th>Property</th>
 *         <th>Type</th>
 *         <th>Argument</th>
 *         <th>Default</th>
 *         <th>Description</th>
 *       </tr>
 *       <tr>
 *         <td>fps</td>
 *         <td>int</td>
 *         <td>&lt;optional&gt;</td>
 *         <td>60</td>
 *         <td>Frames per second the ticks should ideally run.</td>
 *       </tr>
 *     </table>
 */
PodJS = function(options) {
    /**
     * Options provided when this environment was created.
     *
     * @private
     * @var {object} PodJS._options
     */
    var _options;
    
    /**
     * Pod instances currently registered to this Environment.
     * Key = pod name, value = pod instance.
     * 
     * @private
     * @var {object} PodJS._pods
     */
    var _pods = {};

    /**
     * @method getOptions
     * @memberof PodJS
     * @instance
     * @returns {PodJS.Options} A clone of the options passed to this environment.
     */
    this.getOptions = function() {
        var result = {};
        for (var property in _options) {
            if (_options.hasOwnProperty(property)) {
                result[property] = _options[property];
            }
        }
        return result;
    };
    
    /**
     * Retrieves the instance of the pod with the given name that is bound to this environment. If there is no such pod
     * registered, the PodJS environment will instantiate one. Note this might also cause a cascade of other pods to be
     * instantiated and registered.
     * <p>
     * Only pod classes that have been registered can be instantiated. This is normally accomplished by adding script tags
     * to the html file.
     *
     * @method pod
     * @memberof PodJS
     * @instance
     * @param name {string} The name and major version of the pod to retrieve (e.g. "scratch").
     * @returns {Pod} The instance of the pod with the given name that is registered with this environment.
     */
    this.pod = function(name) {
        if (!_pods.hasOwnProperty(name)) {
            if (!PodJS.POD_CLASSES.hasOwnProperty(name)) {
                throw "No pod registered with name '" + name + "'. Use a <script> tag to register the pod class.";
            }
            var podClass = PodJS.POD_CLASSES[name];
            var initParams = new PodJS.PodInitParams();
            initParams.env = this;
            var podInstance = new podClass.constructor(initParams);
            _pods[name] = podInstance;
        }
        return _pods[name];
    };

    /**
     * Create a new ScriptBuilder which will build a script attached to the provided resource.
     * <p>
     * The ScriptBuilder will be bound to this environment and so the available blocks will come from all pods registered in
     * this environment.
     * 
     * @instance
     * @method newScriptBuilder
     * @param {PodJS.Script} script The script to add blocks to (should already be created and bound to its environment and
     *     resource).
     * @return {PodJS.ScriptBuilder} The ScriptBuilder that will build the script.
     * @memberof PodJS.Pod
     */
    this.newScriptBuilder = function(script) {
        /**
         * @class PodJS.ScriptBuilder
         * @classdesc Factory class that assembles blocks to form new {@link PodJS.Script}s attached to {@link PodJS.Pod#Resource}s.
         *     <p>
         *     Instances of this class can only be created by the environment itself.
         *     <p>
         *     The ScriptBuilder, when created, will automatically be populated with instance members that have the same name
         *     as the blocks registered by all pods in the environment. Those instance members will each return a function that,
         *     when called, will add a new block of that type to the script and then return the ScriptBuilder so the next block
         *     in the sequence can be easily added.
         */
        var ScriptBuilder = function() {
            var scriptBuilderThis = this;

            /**
             * The script this ScriptBuilder is creating
             *
             * @instance
             * @member script
             * @type {PodJS.Script}
             * @memberof {PodJS.ScriptBuilder}
             */
            this.script = script;
            
            var construct = function(script) {
                for (var podName in _pods) {
                    if (_pods.hasOwnProperty(podName)) {
                        var pod = _pods[podName];
                        var blockTypes = pod.getBlockTypes();
                        for (var i = 0; i < blockTypes.length; i++) {
                            var blockInfo = blockTypes[i];
                            var blockType = blockInfo.blockType;
                            if (!blockInfo.hasOwnProperty("compatibleWith") || blockInfo.compatibleWith(script.context.resource)) {
                                var addForBlockType = function(blockType) {
                                    scriptBuilderThis[blockType] = function() {
                                        // builder pattern - return instance of the ScriptBuilder.
                                        // but as a side-effect, add the block to the script
                                        // 
                                        // To support parameters, we return a function that, when executed, returns the ScriptBuilder,
                                        // but modifies the parameters.
                                        var parameterInfo = blockInfo.parameterInfo;
                                        if (typeof(parameterInfo) === "undefined" || parameterInfo === null) {
                                            parameterInfo = [];
                                        }
                                        if (parameterInfo.length !== arguments.length) {
                                            throw new Error("Block is expecting " + parameterInfo.length +
                                                " parameters, but specified " + arguments.length)
                                        }
                                        var block = pod.newBlock(blockType, script.context.resource, arguments);
                                        script.addBlock(block);

                                        block.params = arguments;
                                        return this;
                                    };
                                };
                                addForBlockType(blockType);
                            }

                            // TODO: Improve the syntax of scripts by not requiring () for blocks that don't take parameters.
                            // This can be done by using Object.defineProperty(this, blockType, { get : function() { ... } })
                            // so that when the function is retrieved (but not necessarily executed) we can still mutate the script.
                            // The function, if not called, should also have the same properties as the ScriptBuilder, so the builder
                            // pattern can continue whether or not the function is executed.
                        }
                    }
                }
            };

            construct(script);
        };
        
        return new ScriptBuilder();
    };

    // Constructor
    var construct = function(options) {
        _options = options;
    };

    construct(options);
};


/**
 * @class PodJS.PodInitParams
 * @classdesc Initialization parameters for pods. An instance of this object is provided to the pod at construction time.
 * @property {PodJS} env Environment this pod should be bound to.
 */
PodJS.PodInitParams = function() {
    return this;
};

PodJS.PodInitParams.prototype = {
    env : null
};

/**
 * Object providing a map of all pod class names to the corresponding pod class.
 * New pod classes are registered via {@link PodJS.REGISTER_POD_CLASS}.
 *
 * @member {object} PodJS.POD_CLASSES
 */
PodJS.POD_CLASSES = {};

/**
 * Called by Pods to reigster with the environment.
 * <p>
 * This should never be called by an application. Pods call this method when the browser has loaded their class.
 * 
 * @function PodJS.REGISTER_POD_CLASS
 * @param podName The universally-unique name (across all Pods anyone has ever written) of the pod to register. Use podjs.com to
 *     register your name.
 * @param podClass The pointer to the constructor function of the class that is used to create a new pod.
 */
PodJS.REGISTER_POD_CLASS = function(podName, podClass) {
    if (PodJS.POD_CLASSES.hasOwnProperty(podName)) {
        throw "Invalid attempt to register pod '" + podName + "' more than once.";
    }
    PodJS.POD_CLASSES[podName] = podClass;
};

/////////////////////////////////////////////////////////////////////
// PodJS.ScriptContext


/**
 * @static
 * @class PodJS.ScriptContext
 * @classdesc Contains a reference to the environment and resource the script is bound to.
 * 
 * @constructor
 * @desc Constructs a new ScriptContext
 * @param {PodJS} environment The environment the script is bound to
 * @param {PodJS.Pod#Resource} resource The resource the script is bound to
 */
PodJS.ScriptContext = function(environment, resource) {
    
    /**
     * The environment the script is bound to
     *
     * @instance
     * @member environment
     * @type {PodJS}
     * @memberof PodJS.ScriptContext
     */
    this.environment = environment;
    
    /**
     * The resource the script is bound to
     *
     * @instance
     * @member resource
     * @type {PodJS.Pod#Resource}
     * @memberof PodJS.ScriptContext
     */
    this.resource = resource;
};


/////////////////////////////////////////////////////////////////////
// PodJS.Script


/**
 * @static
 * @class PodJS.Script
 * @classdesc Executable sequence of blocks that is associated with a resource.
 * 
 * @constructor
 * @desc Constructs a new Script bound to the environment and resource provided in the given context object.
 * @param {PodJS.ScriptContext} context containing the environment and resource this script is bound to.
 */
PodJS.Script = function(context) {
    
    /**
     * The context, containing a reference to the environment and resource the script is bound to.
     *
     * @instance
     * @member context
     * @type {PodJS.ScriptContext}
     * @memberof PodJS.Script
     */
    this.context = context;
    
    /**
     * The sequence of blocks present in this script.
     * 
     * @instance
     * @private
     * @type {PodJS.Resource#Block[]}
     * @memberof PodJS.Script
     */
    var _blocks = [];

    /**
     * Adds the given block to the end of the script.
     *
     * @instance
     * @method addBlock
     * @memberof PodJS.Script
     * @param {PodJS.Pod#Block} block The instance of the block to add.
     */
    this.addBlock = function(block) {
        _blocks.push(block);
    };
    
    /**
     * Returns a clone of the sequence of blocks present in this script.
     * <p>
     * A clone is returned so the caller cannot accidentally mutate the script without the script being aware.
     *
     * @instance
     * @method getBlocks
     * @memberof PodJS.Script
     * @return {PodJS.Resource#Block[]} A clone of the sequence of blocks
     */
    this.getBlocks = function() {
        var result = [];
        for (var i = 0; i < _blocks.length; i++) {
            result.push(_blocks[i]);
        }
        return result;
    };
};
    

/////////////////////////////////////////////////////////////////////
// PodJS.Pod

/**
 * @static
 * @class PodJS.Pod
 * @classdesc Abstract Base class for a convenience library containing a set of blocks and resources, providing new
 *     capabilities to an application.
 *     <p>
 *     Makes it convenient to import a set of blocks together and associate them with resources, and provides useful
 *     utility methods.
 *     <p>
 *     To create a new Pod, create a new JavaScript file that contains a concrete class that extends this class and registers
 *     the class via {@link PodJS.REGISTER_POD_CLASS}. Applications will need to include your JavaScript file.
 *
 * @constructor
 * @desc Constructs a new Pod with the given initialization parameters.
 * @param {PodJS.PodInitParams} initParams Initialization parameters provided by the environment.
 *
 * @author markroth8
 */
PodJS.Pod = function(initParams) {
    var _pod = this;
    
    /**
     * Maps resource types to maps of resource names to resource instances.
     *
     * @private
     * @type {object}
     */
    var _resourceRegistry = {};
    
    /**
     * The environment this pod is bound to.
     *
     * @private
     * @type {PodJS}
     */
    var _environment = initParams.env;

    /**
     * Deletes the resource with the given name and deregisters it from the pod.
     *
     * @method deleteResourceByName
     * @memberof PodJS.Pod
     * @instance
     * @param {string} resourceName The name of the resource to delete
     * @throws {Error} If a resource with the given name could not be found
     */
    this.deleteResourceByName = function(resourceName) {
        var success = false;
        var resource = null;
        for (var type in _resourceRegistry) {
            if (_resourceRegistry.hasOwnProperty(type)) {
                var resources = _resourceRegistry[type];
                if (resources.hasOwnProperty(resourceName)) {
                    resource = resources[resourceName];
                    delete resources[resourceName];
                    resource.release();
                    success = true;
                    break;
                }
            }
        }
        if (!success) {
            throw new Error("Could not find resource with the name '" + resourceName + "'");
        }
    };

    /**
     * Returns a list of block types that this Pod provides.
     * <p>
     * Note that block type names must be globally unique across all pods. Pod authors should use the website
     * {@link http://podjs.com/} to register block type names so there are no conflicts.
     *
     * @abstract
     * @method getBlockTypes
     * @memberof PodJS.Pod
     * @instance
     * @returns {PodJS.BlockInfo[]} An array of supported block types.
     */
    this.getBlockTypes = function() {
        throw new Error('Method is abstract and must be overridden by a subclass.');
    };

    /**
     * Returns the resource with the given name or null if no such resource was found.
     *
     * @method getResourceByName
     * @memberof PodJS.Pod
     * @instance
     * @param {string} resourceName The name of the resource being queried.
     * @returns {PodJS.Pod#Resource} The resource with the given name or null if no such resource was found.
     */
    this.getResourceByName = function(resourceName) {
        var result = null;
        for (var type in _resourceRegistry) {
            if (_resourceRegistry.hasOwnProperty(type)) {
                var resources = _resourceRegistry[type];
                if (resources.hasOwnProperty(resourceName)) {
                    result = resources[resourceName];
                    break;
                }
            }
        }
        return result;
    };

    /**
     * Returns a list of resources of the given type that have been created.
     *
     * @method getResourcesByType
     * @memberof PodJS.Pod
     * @instance
     * @param {string} resourceType The type of resource being queried.
     * @returns {object} An object mapping resource name to resource instance.
     */
    this.getResourcesByType = function(resourceType) {
        var result = {};
        if (this.getResourceTypeNames().indexOf(resourceType) === -1) {
            throw new Error("Pod does not support resource type '" + resourceType + "'.");
        }
        if (_resourceRegistry.hasOwnProperty(resourceType)) {
            result = _resourceRegistry[resourceType];
        }
        return result;
    };

    /**
     * Returns a list of information about resource types that this Pod provides.
     * <p>
     * Note that resource type names must be globally unique across all pods. Pod authors should use the website
     * {@link http://podjs.com/} to register resource type names so there are no conflicts.
     *
     * @abstract
     * @method getResourceTypes
     * @memberof PodJS.Pod
     * @instance
     * @returns {PodJS.ResourceInfo[]} An array of supported resource types.
     */
    this.getResourceTypes = function() {
        throw new Error('Method is abstract and must be overridden by a subclass.');
    };

    /**
     * Returns a list of names of resource types supported by this pod.
     * <p>
     * This is a convenience method that effectively calls {@link PodJS.Pod#getResourceTypes} and then returns an array of all
     * resourceType property values of each info object.
     *
     * @abstract
     * @method getResourceTypeNames
     * @memberof PodJS.Pod
     * @instance
     * @returns {string[]} An array of supported resource type names
     */
    this.getResourceTypeNames = function() {
        var result = [];
        var types = this.getResourceTypes();
        for (var i = 0; i < types.length; i++) {
            var info = types[i];
            result.push(info.resourceType);
        }
        return result;
    };

    /**
     * Called when a {@link PodJS.ScriptBuilder} wishes to create a new instance of a block.
     * <p>
     * Subclasses should call {@link PodJS.Pod#newBlockClass} to return the constructor for the super-object of the block.
     * The super-object will be bound to the Pod base class. This pattern is mostly done to enforce the contract that
     * no blocks can be created other than for the types specified in getBlockTypes(), and for any future bookkeeping needs.
     *
     * @abstract
     * @method newBlock
     * @memberof PodJS.Pod
     * @instance
     * @param {string} blockType The type of block to be created (e.g. "gotoXY"). Must be one of the block types
     *     returned by {@link PodJS.Pod#getBlockTypes}.
     * @param {PodJS.Block#Resource} resource The resource this block is to be bound to.
     * @param {object} [params] Set of parameters to be used when creating the block (provided by the user).
     * @returns {PodJS.Pod#Block} The instance of the block.
     * @throws {Error} If the block type provided was not one of the valid block types returned by {@link PodJS.Pod#getBlockTypes}.
     *     This check is performed by {@link PodJS.Pod#newBlockClass}.
     * @throws {Error} If the block to be returned would not be compatible with the resource provided. This check
     *     must be performed by the subclass.
     */
    this.newBlock = function(blockType, resource, params) {
        throw new Error('Method is abstract and must be overridden by a subclass.');
    };

    /**
     * Called by the concrete Pod class when it wishes to create a new Block, in order to provide the constructor of the
     * super-class of the block object.
     * <p>
     * The constructor will be bound to the Pod base class so that it can update the resource registry during the lifecycle
     * of the block.
     *
     * @method newBlockClass
     * @memberof PodJS.Pod
     * @instance
     * @param {string} blockType The type of block to be created (e.g. "gotoXY"). Must be one of the block types
     *     returned by {@link PodJS.Pod#getBlockTypes}.
     * @param {PodJS.Block#Resource} resource The resource this block is to be bound to.
     * @param {object} [params] List of parameters to be used when creating the block (provided by the user).
     * @returns {Function} The constructor of the Block class that the subclass should create a new instance of.
     * @throws {Error} If the block type provided was not one of the valid block types returned by {@link PodJS.Pod#getBlockTypes}.
     */
    this.newBlockClass = function(blockType, resource, params) {
        // Check that block type is one of the block types supported by this pod.
        var found = null;
        for (var i = 0; i < this.getBlockTypes().length; i++) {
            var blockInfo = this.getBlockTypes()[i];
            if (blockInfo.blockType === blockType) {
                found = blockInfo;
                break;
            }
        }
        if (found === null) {
            throw new Error("This pod does not know how to create blocks of type '" + blockType + "'");
        }
        
        // Check that the block is compatible with the resource
        if (blockInfo.hasOwnProperty("compatibleWith") && !blockInfo.compatibleWith(resource)) {
            throw new Error("Block '" + blockType + "' is not compatible with specified resource of type '" +
                resource.resourceType + "'");
        }
        
        if (typeof(params) === "undefined" || params === null) {
            params = [];
        }
        
        /**
         * @class PodJS.Pod#BlockContext
         * @classdesc Context provided to blocks that gives them access to the environment, pod and resource.
         */
        var blockContext = {
            /**
             * The environment this block is bound to.
             *
             * @instance
             * @member {PodJS} environment
             * @memberOf PodJS.Pod#BlockContext
             */
            environment : _environment,

            /**
             * The pod this block is bound to.
             *
             * @instance
             * @member {PodJS.Pod} pod
             * @memberOf PodJS.Pod#BlockContext
             */
            pod : _pod,

            /**
             * The resource this block is bound to.
             *
             * @instance
             * @member {PodJS.Pod#Resource} resource
             * @memberOf PodJS.Pod#BlockContext
             */
            resource : resource
        };

        /**
         * @class PodJS.Pod#Block
         * @classdesc Abstract Base class for block implementations (provided by pods).
         *     <p>
         *     A block is an atomic unit of a script.
         *     <p>
         *     New types of blocks are added to the system via pods.
         *     <p>
         *     Blocks are attached to {@link PodJS.Pod#Resource}s and can manipulate them.
         *     <p>
         *     Blocks also have access to the script and to the environment so they can take global actions.
         *     <p>
         *     This is an inner class bound to the Pod superclass that has access to the internal resources of the pod.
         *     Pod sub-classes should ensure that all created resources extend from the resource
         *     superclass returned by {@link PodJS.Pod#newBlock}.
         */
        var Block = {
            /**
             * The name of the type of block this is an instance of.
             * 
             * @instance
             * @member {string} blockType
             * @memberOf PodJS.Pod#Block
             */
            blockType : blockType,

            /**
             * The BlockContext containing a reference to the resource to which it is bound and
             * a reference to the script in which it is executing.
             * 
             * @instance
             * @member {PodJS.BlockContext} context
             * @memberOf PodJS.Pod#Block
             */
            context : blockContext,

            /**
             * Parameters for the instance of this block (these come from the user of the block).
             *
             * @instance
             * @member {object} params
             * @memberOf PodJS.Pod#Block
             */
            params : params,

            /**
             * Gets called by the environment when this block is active.
             * <p>
             * Pods are not responsible for calling tick() on their own blocks. That is taken care of by the environment.
             * <p>
             * The super-class version of tick() does nothing. Subclasses can optionally override to perform additional actions on each
             * environment tick.
             *
             * @method tick
             * @memberOf PodJS.Pod#Block
             * @instance
             */
            tick : function() {
            },
            
            /**
             * Release the system resources associated with this block.
             * <p>
             * Sub-classes can optionally override this method, but must always call the super-class to ensure the proper
             * bookkeeping takes place. Note that blocks will continue to receive ticks until deleted / released.
             *
             * @method release
             * @memberOf PodJS.Pod#Block
             * @instance
             */
            release : function() {
            }
        };
        
        return Block;
    };
    
    /**
     * Called when the environment or an application wishes to create a new resource of the given type.
     * <p>
     * Most Pods also provide convenience methods (e.g. newSprite(...) instead of newResource("sprite", ...) but
     * this method is necessary for reflection-style access.
     * <p>
     * Subclasses should call {@link PodJS.Pod#newResourceClass} to return the constructor for the super-class of the resource.
     * The constructor will be bound to the Pod base class so that it can update the resource registry during the lifecycle
     * of the resource.
     *
     * @abstract
     * @method newResource
     * @memberof PodJS.Pod
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
        throw new Error('Method is abstract and must be overridden by a subclass.');
    };

    /**
     * Called by the concrete Pod class when it wishes to create a new Resource, in order to provide the constructor of the
     * super-class of the object.
     * <p>
     * The constructor will be bound to the Pod base class so that it can update the resource registry during the lifecycle
     * of the resource.
     *
     * @method newResourceClass
     * @memberof PodJS.Pod
     * @instance
     * @param {string} resourceType The type of resource to be created (e.g. "sprite"). Must be one of the resource types
     *     returned by {@link getResourceTypes}.
     * @param {string} resourceName The name of the resource to create. This name must be unique for the type of resource so that
     *     the resource can be later retrieved and, if necessary, deleted.
     * @param {object} [options] Set of parameters to be used when creating the resource.
     * @returns {Function} the constructor of the Resource class that the subclass should create a new instance of.
     * @throws {Error} If the resource type provided was not valid.
     * @throws {Error} If a resource of this type already exists with the given name.
     */
    this.newResourceClass = function(resourceType, resourceName, options) {
        
        // Check that resource type is one of the resource types supported by this pod.
        if (this.getResourceTypeNames().indexOf(resourceType) === -1) {
            throw new Error("This pod does not know how to create resources of type '" + resourceType + "'");
        }
        
        /**
         * @class PodJS.Pod#ResourceContext
         * @classdesc Context provided to resources that gives them access to the environment and pod.
         */
        var resourceContext = {
            /**
             * The environment this resource is bound to.
             *
             * @instance
             * @member {PodJS} environment
             * @memberOf PodJS.Pod#ResourceContext
             */
            environment : _environment,

            /**
             * The pod this resource is bound to.
             *
             * @instance
             * @member {PodJS.Pod} pod
             * @memberOf PodJS.Pod#ResourceContext
             */
            pod : _pod
        };

        /**
         * @class PodJS.Pod#Resource
         * @classdesc Base class for a resource that belongs to a Pod.
         *     <p>
         *     This is an inner class bound to the Pod superclass that has access to the internal resource registry that is
         *     present in every pod. Pod sub-classes should ensure that all created resources extend from the resource
         *     superclass returned by {@link PodJS.Pod#newResource}.
         */
        var Resource = {
            /**
             * The name of this resource, unique for the resource type.
             * 
             * @type {string}
             * @memberof PodJS.Pod#Resource
             * @instance
             */
            resourceName : resourceName,
            
            /**
             * The type of this resource.
             * 
             * @type {string}
             * @memberof PodJS.Pod#Resource
             * @instance
             */
            resourceType : resourceType,
            
            /**
             * Options for this resource.
             * 
             * @type {object}
             * @memberof PodJS.Pod#Resource
             * @instance
             */
            options : options,

            /**
             * Context containing references to the environment and pod to which this resource is bound.
             * 
             * @type {PodJS.Pod#ResourceContext}
             * @memberof PodJS.Pod#Resource
             * @instance
             */
            context : resourceContext,
            
            /**
             * Scripts associated with this resource.
             * 
             * @type {PodJS.Script[]}
             * @memberof PodJS.Pod#Resource
             * @instance
             */
            scripts : [],
            
            /**
             * Create a new {@link PodJS.ScriptBuilder} which will build a script attached to this resource.
             * 
             * @method newScript
             * @return {PodJS.ScriptBuilder} The ScriptBuilder that will build the script.
             * @memberof PodJS.Pod#Resource
             * @instance
             */
            newScript : function() {
                var scriptContext = new PodJS.ScriptContext(this.context.environment, this);
                var script = new PodJS.Script(scriptContext);
                this.scripts.push(script);
                return _environment.newScriptBuilder(script);
            },
            
            /**
             * Release the system resources associated with this resource and remove it from the pod's resource registry.
             * <p>
             * Sub-classes can optionally override this method, but must always call the super-class to ensure the proper
             * bookkeeping takes place. Note that resources will continue to receive ticks until deleted / released.
             *
             * @method release
             * @memberof PodJS.Pod#Resource
             * @instance
             */
            release : function() {
                var resources = _resourceRegistry[resourceType];
                delete resources[resourceName];
            },
            
            /**
             * Gets called periodically by the environment when the next action is to take place.
             * <p>
             * The super-class version of tick() does nothing. Subclasses can optionally override to perform additional actions
             * on each environment tick.
             *
             * @method tick
             * @memberof PodJS.Pod#Resource
             * @instance
             */
            tick : function() {
            }
        };
        
        // Register with resourceRegistry
        if (!_resourceRegistry.hasOwnProperty(resourceType)) {
            _resourceRegistry[resourceType] = {};
        }
        var resources = _resourceRegistry[resourceType];
        if (resources.hasOwnProperty(resourceName)) {
            throw new Error("A resource of type '" + resourceType + "' already exists in this Pod with the name '" +
                resourceName + "'. Please choose a different name.");
        }
        resources[resourceName] = Resource;
        
        return Resource;
    };

    /**
     * Gets called periodically by the environment when the next action is to take place.
     * <p>
     * Pods are not responsible for calling tick() on their own resources or blocks. That is taken care of by the environment.
     * <p>
     * The super-class version of tick() does nothing. Subclasses can optionally override to perform additional actions on each
     * environment tick.
     *
     * @method tick
     * @memberof PodJS.Pod
     * @instance
     */
    this.tick = function() {
    };
    
    var construct = function() {
    };

    construct();
};

/////////////////////////////////////////////////////////////////////
// PodJS.BlockInfo.ParameterInfo

/**
 * @static
 * @class PodJS.BlockInfo.ParameterInfo
 * @classdesc Information about a parameter provided to a block.
 */
PodJS.BlockInfo.ParameterInfo = {
    /**
     * Name of the parameter
     *
     * @instance
     * @type {string}
     * @member name
     * @memberOf PodJS.BlockInfo.ParameterInfo
     */
    name : null,
    
    /**
     * Description of this parameter
     *
     * @instance
     * @type {string}
     * @member description
     * @memberOf PodJS.BlockInfo.ParameterInfo
     */
    description : null
};


/////////////////////////////////////////////////////////////////////
// PodJS.BlockInfo

/**
 * @static
 * @class PodJS.BlockInfo
 * @classdesc Information about a block provided by a Pod, including which resource types it is compatible with and
 *     what parameters are accepted. Note that the object provided does not have to extend from this object - it must merely
 *     have the same properties.
 */
PodJS.BlockInfo = {
    /**
     * Name of the block type
     *
     * @instance
     * @type {string}
     * @member blockType
     * @memberOf PodJS.BlockInfo
     */
    blockType : null,
    
    /**
     * Description of this block
     *
     * @instance
     * @type {string}
     * @member description
     * @memberOf PodJS.BlockInfo
     */
    description : null,
    
    /**
     * Description of Ordered list of parameters accepted by this block. If this property is not present, it is assumed the
     * block requires no parameters.
     *
     * @instance
     * @type {PodJS.BlockInfo.ParameterInfo[]}
     * @member parameterInfo
     * @memberOf PodJS.BlockInfo
     */
    parameterInfo : [],
    
    /**
     * Returns true if this block is compatible with the specified resource, or false if not.
     * <p>
     * If not compatible, the {@link PodJS.ScriptBuilder} will refuse to attach the block to the resource.
     * <p>
     * The default implementation of this method is to return true. Subclasses must override if the block will not work with all
     * resources. If an object is provided with no compatibleWith method, it is assumed the block is compatible with all resources.
     *
     * @method compatibleWith
     * @memberOf PodJS.BlockInfo
     * @param {PodJS.Pod#Resource} resource The resource to check for compatibility.
     * @return {boolean} True if the block is compatible, or false if not.
     * @instance
     */
    compatibleWith : function(resource) {
        return true;
    }
};

/////////////////////////////////////////////////////////////////////
// PodJS.ResourceInfo

/**
 * @static
 * @class PodJS.ResourceInfo
 * @classdesc Information about a resource provided by a Pod, including name and description.
 */
PodJS.ResourceInfo = {
    /**
     * Name of the resource type
     *
     * @instance
     * @type {string}
     * @member resourceType
     * @memberOf PodJS.ResourceInfo
     */
    resourceType : null,
    
    /**
     * Description of this resource
     *
     * @instance
     * @type {string}
     * @member description
     * @memberOf PodJS.ResourceInfo
     */
    description : null
};

} // end browser detect