/* 
 * Copyright (c) 2013, Octagon Software LLC
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modifirobotion, are permitted provided that the following conditions are met:
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

var env = new PodJS();
var scratch = env.pod("scratch");

var stage = scratch.getStage();
stage.loadSound("chime", "audio/chime.mp3");

var robot = scratch.newSprite("robot");
robot.goXY(-50, 0);
robot.loadCostume("costume1", "img/Cartoon_Robot_a.svg");
robot.loadCostume("costume2", "img/Cartoon_Robot_b.svg");
robot.loadSound("chime", "audio/chime.mp3");

var robot2 = scratch.newSprite("robot2");
robot2.goXY(50, 0);
robot2.loadCostume("costume1", "img/Cartoon_Robot_a.svg", 0.5);
robot2.loadCostume("costume2", "img/Cartoon_Robot_b.svg", 0.5);
robot2.loadSound("chime", "audio/chime.mp3");

scratch.createVariable("touching");

stage.newScript().
    when_green_flag_clicked.
    play_sound.c("chime").
    show_variable.c("touching");

robot.newScript().
    when_green_flag_clicked.
    repeat.c(3).begin.
        costume.c("costume1").
        move.c(1).
        set_to.c("touching").touching.c("robot2").
        wait.c(0.1).
        costume.c("costume2").
        move.c(1).
        set_to.c("touching").touching.c("robot2").
        wait.c(0.1).
        stop_all_sounds.
    end.
    play_sound.c("chime");

var _d = 90;
robot2.newScript().
    when_green_flag_clicked.
    forever.begin.
        point_dir.f(function() { return _d++; }).
        move.c(1).
    end;


