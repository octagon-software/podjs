/* 
 *   Copyright 2013 Octagon Software LLC
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */
var env = new PodJS();
var scratch = env.pod("scratch");
var robot = scratch.newSprite("robot");
robot.loadCostume("costume1", "img/Cartoon_Robot_a.png");
robot.loadCostume("costume2", "img/Cartoon_Robot_b.png");

robot.newScript().
    when_green_flag_clicked.
    forever.begin.
        costume.c("costume2").
        move.c(10).
        wait.c(1).
        costume.c("costume1").
        move.c(-10).
        wait.c(1).
    end;
