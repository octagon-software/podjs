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

var PodJSTest = TestCase("PodJSTest");

PodJSTest.prototype.test_POD_CLASSES = function() {
    assertTrue(typeof(PodJS.POD_CLASSES) !== "undefined");
    assertTrue(typeof(PodJS.POD_CLASSES["test_pod"]) === "undefined");
};

PodJSTest.prototype.test_REGISTER_POD_CLASS = function() {
    assertTrue(typeof(PodJS.REGISTER_POD_CLASS) !== "undefined");
    assertTrue(typeof(PodJS.POD_CLASSES["test_pod"]) === "undefined");
    PodJS.REGISTER_POD_CLASS("test_pod", {});
    assertTrue(typeof(PodJS.POD_CLASSES["test_pod"]) === "object");
    try {
        PodJS.REGISTER_POD_CLASS("test_pod", {});
        fail("Should not have allowed duplicate registration");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }
};

PodJSTest.prototype.testPodJSGetOptions = function() {
    var podJS = new PodJS();
    assertTrue(podJS.getOptions() !== null);
    
    var options = {a : 1};
    podJS = new PodJS(options);
    assertEquals(1, podJS.getOptions().a);
};

/////////////////////////////////////////////////////////////
// Test PodJS.Pod

PodJSTest.prototype.testRegisterPod = function() {

    // Define ExamplePod
    var ExamplePod = function(initParams) {
        PodJS.Pod.call(this, initParams);
        this.attr = 0;
    };
    ExamplePod.prototype = Object.create(PodJS.Pod.prototype);
    ExamplePod.constructor = ExamplePod;
    PodJS.REGISTER_POD_CLASS("example", ExamplePod);
    
    // Create an environment
    var env = new PodJS();
    
    // Check that a non-existent pod cannot be created
    try {
        env.pod("nonExistentPod");
        fail("Should not have allowed creation of a non-existent pod");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }
    
    // Check that a new example pod can be created
    var example = env.pod("example");
    assertEquals(0, example.attr);
    example.attr = 1;
    assertEquals(1, example.attr);
    
    // make sure pods are singletons per environment
    var example2 = env.pod("example");
    assertEquals(1, example2.attr);
    var env2 = new PodJS();
    var example2a = env2.pod("example");
    assertEquals(0, example2a.attr);
    assertEquals(1, example2.attr);
};

// Check that abstract methods throw errors when not overridden.
PodJSTest.prototype.testPodAbstractMethods = function() {
    // Define ExamplePod
    var ExamplePod = function(initParams) {
        PodJS.Pod.call(this, initParams);
    };
    ExamplePod.prototype = Object.create(PodJS.Pod.prototype);
    ExamplePod.constructor = ExamplePod;
    PodJS.REGISTER_POD_CLASS("example2", ExamplePod);
    
    // Create an environment and pod
    var env = new PodJS();
    var example = env.pod("example2");
    
    // Check getBlockTypes() is abstract
    try {
        example.getBlockTypes();
        fail("Should not have allowed call of abstract method");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }
    
    // Check getResourceTypes() is abstract
    try {
        example.getResourceTypes();
        fail("Should not have allowed call of abstract method");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }
    
    // Check newResource() is abstract
    try {
        example.newResource();
        fail("Should not have allowed call of abstract method");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }
    
    // Check newBlock() is abstract
    try {
        example.newBlock();
        fail("Should not have allowed call of abstract method");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }

};

PodJSTest.prototype.testPodNewResource = function() {
    // Define ExamplePod
    var ExamplePod = function(initParams) {
        PodJS.Pod.call(this, initParams);
        
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

        this.newResource = function(resourceType, resourceName, options) {
            var resourceBase = this.newResourceClass(resourceType, resourceName, options);
            var resource = Object.create(resourceBase);
            // normally we'd extend this class to add additional functionality.
            resource.register(resource);
            return resource;
        };
    };
    ExamplePod.prototype = Object.create(PodJS.Pod.prototype);
    ExamplePod.constructor = ExamplePod;
    PodJS.REGISTER_POD_CLASS("example3", ExamplePod);
    
    // Create an environment and pod
    var env = new PodJS();
    var example = env.pod("example3");
    
    // Test we cannot create a resource for a type that is not defined
    try {
        example.newResource("movie", "lumiere");
        fail("Should not have allowed creating an unknown resource type");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }

    // test newResource
    var cat = example.newResource("sprite", "cat");
    assertNotNull(cat);

    // Test we cannot create a resource with the same name
    try {
        example.newResource("sprite", "cat");
        fail("Should not have allowed creating a resource with the same name");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }

    // test newResource can be called more than once
    var dog = example.newResource("sprite", "dog");
    assertNotNull(dog);

    // test newResource can be called with a different type
    var stage1 = example.newResource("stage", "stage1");
    assertNotNull(stage1);
    
    // Check getResourceByName() can find the registered resources
    assertEquals("cat", example.getResourceByName("cat").resourceName);
    assertEquals("dog", example.getResourceByName("dog").resourceName);
    assertEquals("stage1", example.getResourceByName("stage1").resourceName);
    assertNull(example.getResourceByName("unknownResourceName"));
    
    // Check getResourcesByType() can find the registered resources
    assertTrue(example.getResourcesByType("sprite").hasOwnProperty("cat"));
    assertTrue(example.getResourcesByType("sprite").hasOwnProperty("dog"));
    assertFalse(example.getResourcesByType("sprite").hasOwnProperty("stage1"));
    assertFalse(example.getResourcesByType("stage").hasOwnProperty("cat"));
    assertFalse(example.getResourcesByType("stage").hasOwnProperty("dog"));
    assertTrue(example.getResourcesByType("stage").hasOwnProperty("stage1"));

    try {
        example.getResourcesByType("movie");
        fail("Should not have allowed getting resources for an unsupported type");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }
    
    // Now, delete a resource
    example.deleteResourceByName("dog");
    assertNull(example.getResourceByName("dog"));
    assertFalse(example.getResourcesByType("sprite").hasOwnProperty("dog"));
    assertEquals("cat", example.getResourceByName("cat").resourceName);
    assertTrue(example.getResourcesByType("sprite").hasOwnProperty("cat"));
    
    try {
        example.deleteResourceByName("dog");
        fail("Should not have allowed deleting a resource that is already gone");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }
};

/////////////////////////////////////////////////////////////
// Test PodJS.Block

PodJSTest.prototype.testBlock = function() {
    // Define ExamplePod
    var ExamplePod = function(initParams) {
        PodJS.Pod.call(this, initParams);
        
        this.getBlockTypes = function() {
            return [
                {
                    blockType : "sprite_move",
                    description : "Move the sprite"
                }, 
                {
                    blockType : "sprite_next_costume",
                    description : "Change the sprite to the next costume"
                }
            ];
        };
        
        this.newBlock = function(blockType, resource, params) {
            var blockClass = this.newBlockClass(blockType, resource, params);
            var block = Object.create(blockClass);
            return block;
        };
    };
    ExamplePod.prototype = Object.create(PodJS.Pod.prototype);
    ExamplePod.constructor = ExamplePod;
    PodJS.REGISTER_POD_CLASS("example4", ExamplePod);
    
    // Create an environment and pod
    var env = new PodJS();
    var example = env.pod("example4");
    
    // Test getBlockTypes()
    // Note we're really only testing the subclass here since the base class is abstract
    var blockTypeList = [];
    for (var i = 0; i < example.getBlockTypes().length; i++) {
        blockTypeList.push(example.getBlockTypes()[i].blockType);
    }
    assertEquals(["sprite_move", "sprite_next_costume"], blockTypeList);

    // Test newBlock()
    var exampleResource = { a : 1 };
    var params = { p1 : 1, p2 : 2 };
    var spriteMoveBlock = example.newBlock("sprite_move", exampleResource, params);
    assertNotNull(spriteMoveBlock);
    spriteMoveBlock.tag = 1;

    // test newBlock can be called more than once
    var spriteMoveBlock2 = example.newBlock("sprite_move", exampleResource, params);
    assertNotNull(spriteMoveBlock2);
    spriteMoveBlock2.tag = 2;
    assertEquals(1, spriteMoveBlock.tag);
    assertEquals(2, spriteMoveBlock2.tag);

    // test newBlock can be called with a different type
    var spriteNextCostumeBlock = example.newBlock("sprite_next_costume", exampleResource);
    assertNotNull(spriteNextCostumeBlock);

    // Test we cannot create a block for a type that is not defined
    try {
        example.newBlock("movie", exampleResource);
        fail("Should not have allowed creating an unknown block type");
    } catch (e) {
        if (e.name === "AssertError") throw e;
        // pass
    }
};

/////////////////////////////////////////////////////////////
// Test PodJS.ScriptBuilder and friends

PodJSTest.prototype.testScriptBuilder = function() {
    // Define ExamplePod
    var ExamplePod = function(initParams) {
        PodJS.Pod.call(this, initParams);
        
        this.getBlockTypes = function() {
            return [
                {
                    blockType : "sprite_move",
                    description : "Move the sprite",
                    parameterInfo : [
                        { name : "a" }
                    ],
                    compatibleWith : function(resource) {
                        return resource.resourceType === "sprite";
                    }
                }, 
                {
                    blockType : "sprite_next_costume",
                    description : "Change the sprite to the next costume",
                    parameterInfo : [
                        { name : "a" }
                    ],
                    compatibleWith : function(resource) {
                        return resource.resourceType === "sprite";
                    }
                },
                {
                    blockType : "stage_next_costume",
                    description : "Change the stage to the next costume",
                    parameterInfo : [
                        { name : "a" }
                    ],
                    compatibleWith : function(resource) {
                        return resource.resourceType === "stage";
                    }
                }
            ];
        };
        
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
       
        this.newResource = function(resourceType, resourceName, options) {
            var resourceBase = this.newResourceClass(resourceType, resourceName, options);
            var resource = Object.create(resourceBase);
            resource.register(resource);
            return resource;
        };

        this.newBlock = function(blockType, resource, params) {
            var blockClass = this.newBlockClass(blockType, resource, params);
            var block = Object.create(blockClass);
            return block;
        };
    };
    ExamplePod.prototype = Object.create(PodJS.Pod.prototype);
    ExamplePod.constructor = ExamplePod;
    PodJS.REGISTER_POD_CLASS("example5", ExamplePod);
    
    // Create an environment and pod
    var env = new PodJS();
    var pod = env.pod("example5");

    var cat = pod.newResource("sprite", "cat");
    var stage1 = pod.newResource("stage", "stage1");
    var scriptBuilder = cat.newScript();
    assertNotNull(scriptBuilder);

    assertTrue(scriptBuilder.hasOwnProperty("sprite_move"));
    assertTrue(scriptBuilder.hasOwnProperty("sprite_next_costume"));
    assertFalse(scriptBuilder.hasOwnProperty("stage_next_costume"));
    
    assertEquals(0, scriptBuilder.blockScript.getBlocks().length);
    
    scriptBuilder.sprite_move;
    assertEquals(1, scriptBuilder.blockScript.getBlocks().length);
    assertEquals("sprite_move", scriptBuilder.blockScript.getBlocks()[0].blockType);
    
    scriptBuilder.c(1);
    assertEquals(2, scriptBuilder.blockScript.getBlocks().length);
    assertEquals("sprite_move", scriptBuilder.blockScript.getBlocks()[0].blockType);
    assertEquals("constant", scriptBuilder.blockScript.getBlocks()[1].blockType);
    assertEquals(1, scriptBuilder.blockScript.getBlocks()[1].value);
    
    scriptBuilder.sprite_next_costume.c(2).sprite_move.c(3);
    assertEquals(6, scriptBuilder.blockScript.getBlocks().length);
    assertEquals("sprite_next_costume", scriptBuilder.blockScript.getBlocks()[2].blockType);
    assertEquals("constant", scriptBuilder.blockScript.getBlocks()[3].blockType);
    assertEquals(2, scriptBuilder.blockScript.getBlocks()[3].value);
    assertEquals("sprite_move", scriptBuilder.blockScript.getBlocks()[4].blockType);
    assertEquals("constant", scriptBuilder.blockScript.getBlocks()[5].blockType);
    assertEquals(3, scriptBuilder.blockScript.getBlocks()[5].value);

    var scriptBuilder2 = stage1.newScript();
    assertNotNull(scriptBuilder2);

    assertFalse(scriptBuilder2.hasOwnProperty("sprite_move"));
    assertFalse(scriptBuilder2.hasOwnProperty("sprite_next_costume"));
    assertTrue(scriptBuilder2.hasOwnProperty("stage_next_costume"));
    
    assertEquals(0, scriptBuilder2.blockScript.getBlocks().length);
    
    scriptBuilder2.stage_next_costume.c(1);
    assertEquals(2, scriptBuilder2.blockScript.getBlocks().length);
    assertEquals("stage_next_costume", scriptBuilder2.blockScript.getBlocks()[0].blockType);
    assertEquals("constant", scriptBuilder2.blockScript.getBlocks()[1].blockType);
    assertEquals(1, scriptBuilder2.blockScript.getBlocks()[1].value);
};

