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
 * @classdesc Main environment for pod.js.
 *     <p>
 *     The class has a static registry of pod classes which have been loaded. Note that only one version of each Pod class can be
 *     registered globally per page. Pod classes get registered by their corresponding scripts, loaded by the html page.
 *     <p>
 *     Multiple PodJS environments can be created on the same page via instances of this class. Each instance has its own timer
 *     and its own instances of the registered pods, created lazily in dependency order when requested by the application.
 *     <p>
 *     The optional options object provided contains both environment settings and settings that are applicable to specific
 *     pods. Pods will consume only the options they care about.
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
 *
 * @author markroth8
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
// Pod

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
    /**
     * Maps resource types to maps of resource names to resource instances.
     *
     * @private
     * @type {object}
     */
    var _resourceRegistry = {};

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
     * @returns {string[]} An array of supported block types.
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
        if (this.getResourceTypes().indexOf(resourceType) === -1) {
            throw new Error("Pod does not support resource type '" + resourceType + "'.");
        }
        if (_resourceRegistry.hasOwnProperty(resourceType)) {
            result = _resourceRegistry[resourceType];
        }
        return result;
    };

    /**
     * Returns a list of resource types that this Pod provides.
     * <p>
     * Note that resource type names must be globally unique across all pods. Pod authors should use the website
     * {@link http://podjs.com/} to register resource type names so there are no conflicts.
     *
     * @abstract
     * @method getResourceTypes
     * @memberof PodJS.Pod
     * @instance
     * @returns {string[]} An array of supported resource types.
     */
    this.getResourceTypes = function() {
        throw new Error('Method is abstract and must be overridden by a subclass.');
    };

    /**
     * Called when a {@link PodJS.ScriptBuilder} wishes to create a new instance of a block.
     *
     * @abstract
     * @method newBlock
     * @memberof PodJS.Pod
     * @instance
     * @param {string} blockType The type of block to be created (e.g. "gotoXY"). Must be one of the block types
     *     returned by {@link getBlockTypes}.
     * @param {object} [options] Set of options to be used when creating the block.
     * @returns {PodJS.Block} A new block instance
     * @throws {Error} If the block type provided was not valid.
     */
    this.newBlock = function(blockType, options) {
        throw new Error('Method is abstract and must be overridden by a subclass.');
    };

    /**
     * Called when the environment or an application wishes to create a new resource of the given type.
     * <p>
     * Most Pods also provide convenience methods (e.g. newSprite(...) instead of newResource("sprite", ...) but
     * this method is necessary for reflection-style access.
     * <p>
     * Superclasses should call the base class version of this method to return the super-object for the resource.
     * The super-object will be bound to the Pod base class so that it can update the resource registry during the lifecycle
     * of the resource.
     *
     * @method newResource
     * @memberof PodJS.Pod
     * @instance
     * @param {string} resourceType The type of resource to be created (e.g. "sprite"). Must be one of the resource types
     *     returned by {@link getResourceTypes}.
     * @param {string} resourceName The name of the resource to create. This name must be unique for the type of resource so that
     *     the resource can be later retrieved and, if necessary, deleted.
     * @param {object} [options] Set of parameters to be used when creating the resource.
     * @returns {PodJS.Pod#Resource} A new resource instance
     * @throws {Error} If the resource type provided was not valid.
     * @throws {Error} If a resource of this type already exists with the given name.
     */
    this.newResource = function(resourceType, resourceName, options) {
        
        // Check that resource type is one of the resource types supported by this pod.
        if (this.getResourceTypes().indexOf(resourceType) === -1) {
            throw new Error("This pod does not know how to create resources of type '" + resourceType + "'");
        }
        
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
    

} // end browser detect