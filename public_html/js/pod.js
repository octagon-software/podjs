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

/**
 * @global
 * @class PodJS
 * @classdesc Main environment for pod.js, which keeps track of globally-registered Pod classes and provides a scope for creating
 *     Pods such that multiple environments can co-exist on the same page.
 * 
 *     The environment contains a registry of all registered pod classes. Note that only one version of each Pod class can be
 *     registered globally per page.
 * 
 * @desc Constructs a new PodJS environment with the given options.
 * @param {PodJS.Options} [options] An Object containing options for the environment. All options apply globally except for the ones
 *     that appear under the property "pod", which are passed to the corresponding Pod upon creation.
 *
 * @author markroth8
 */
PodJS = function(options) {
    var that = this;
    
    /**
     * Options provided when this environment was created.
     *
     * @private
     * @var {object} PodJS._options
     */
    var _options = options;

};

/**
 * @class PodJS.Options
 * @classdesc Options to be passed in to the PodJS environment upon construction.
 * @property {int} [fps=60]  Frames per second the ticks should ideally run at.
 * @property {object} [pod={}] Options for each pod. Properties under "pod" correspond to the names of each pod.
 */
PodJS.Options = function() {
};

PodJS.Options.prototype = {
    fps : 60,
    pod : {}
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
