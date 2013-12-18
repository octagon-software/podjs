doc: public_html/js/pod.js
	mkdir -p doc
	/home/mroth/programs/jsdoc-3.2.2/jsdoc -d doc public_html/js/pod.js ../podjs_scratch/public_html/js/pod_scratch.js

coverage:
	java -jar /home/mroth/programs/JsTestDriver-1.3.5/JsTestDriver-1.3.5.jar --tests all --config config/jsTestDriver.conf --testOutput /tmp/coverage.dat
	genhtml -o /tmp/coverage.dat/ /tmp/coverage.dat/jsTestDriver.conf-coverage.dat

clean:
	rm -rf doc

