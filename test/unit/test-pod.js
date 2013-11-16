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

PodJSTest = TestCase("PodJS");

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

PodJSTest.prototype.testPodJSOptions = function() {
    // Test defaults:
    assertEquals(60, new PodJS.Options().fps);
    assertEquals({}, new PodJS.Options().pod);
};