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

stage.loadBackdrop("track", "img/bigrace/track.svg").
    switchBackdrop("track");

var addRacer = function(name, y, scale) {
    var sprite = scratch.newSprite(name).
        goXY(-200, y).
        loadCostume(name, "img/bigrace/" + name + ".svg", scale).
        loadSound("win", "audio/bigrace/" + name + ".mp3");
    
    sprite.newScript().
        when_green_flag_clicked.
        point_dir.c(90).
        go_xy.c(-200).c(y);

    sprite.newScript().
        when_receive.c("OnYourMarks").
        repeat_until.touching.c("start").begin.
            change_x.c(1).
        end;

    sprite.newScript().
        when_receive.c("Go").
        repeat_until.touching.c("finish").begin.
            change_x.random_from_to.c(1).c(5).
            point_dir.c(92).
            point_dir.c(88).
        end.
        if_then.equals.c(0).length_of.c("places").begin.
            stop_all_sounds.
        end.
        add_to.c(name).c("places").
        point_dir.c(90).
        play_sound.c("win").
        if_then.equals.c(name).item_of.c(1).c("places").begin.
            forever.begin.
                change_y.c(10).
                wait.c(0.2).
                change_y.c(-10).
                wait.c(0.2).
            end.
        end;
};

scratch.newSprite("start").
    goXY(-155, 0).
    loadCostume("start", "img/bigrace/start_ribbon.svg");

scratch.newSprite("finish").
    goXY(220, 0).
    loadCostume("finish", "img/bigrace/finish_ribbon.svg");

scratch.newSprite("announce").
    hide().
    loadCostume("marks", "img/bigrace/on_your_marks.svg").
    loadSound("marks", "audio/bigrace/marks.mp3").
    loadCostume("set", "img/bigrace/get_set.svg").
    loadSound("set", "audio/bigrace/get_set.mp3").
    loadCostume("go", "img/bigrace/go.svg").
    loadSound("go", "audio/bigrace/go.mp3").
    loadSound("race", "audio/bigrace/william_tell.mp3");

scratch.createListVariable("places");

stage.newScript().
    when_green_flag_clicked.
    hide_list.c("places").
    delete_of.c("all").c("places").
    wait.c(1).
    broadcast.c("GetReady");

scratch.sprite("announce").newScript().
    when_green_flag_clicked.
    hide;

scratch.sprite("announce").newScript().
    when_receive.c("GetReady").
    costume.c("marks").
    show.
    broadcast.c("OnYourMarks").
    play_sound.c("marks").
    wait.c(2).
    costume.c("set").
    play_sound.c("set").
    wait.c(2).
    costume.c("go").
    broadcast.c("Go").
    play_sound.c("go").
    wait.c(0.5).
    play_sound.c("race").
    wait.c(2).
    hide.
    wait.c(5).
    show_list.c("places");

addRacer("frog", 115, 0.15);
addRacer("hippo", 0, 0.3);
addRacer("dino", -125, 0.3);
