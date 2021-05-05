/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 Martin Cserhalmi
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

export interface WQConfig {
    display_default_width: number,              // Default width of the canvas.
    display_default_height: number,             // Default height of the canvas.

    display_generate_canvas_ui: boolean;        // Generate canvas element, false if we want to use a DOM ui only.
    display_frametime_logging?: boolean,        // Print frame time.
    display_framerate_logging?: boolean,        // Print FPS in console.
    display_smoothing_disabled?: boolean,       // Canvas image smoothing flag.
    display_pixel_multiplier?: number,          // Scale canvas by specified amount. Good for pixel art.
    display_always_focus?: boolean,             // Update when unfocused.

    display_fullscreen?: boolean,               // Should canvas area cover the whole browser window(this does not enable a fullscreen window).
    display_hide_cursor?: boolean,              // Hide standard browser cursor.
    display_allow_shrink?: boolean;             // Allow canvas to shrink below default w/h.
    display_should_clear?: boolean,             // Should canvas always be cleared on next frame.
    display_clear_color?: string,               // Canvas background color.

    debug_log: boolean;                         // Display debug loggin.
    tick_timestep: number;                      // Desired timestep.
};

export const DefaultConfig: WQConfig = {
    display_generate_canvas_ui: false,
    display_default_width: 960,
    display_default_height: 540,

    display_pixel_multiplier: 1,

    display_clear_color: 'rgba(53, 43, 49, 255)',

    display_frametime_logging: false,
    display_framerate_logging: false,
    display_smoothing_disabled: true,
    display_always_focus: false,

    display_fullscreen: true,
    display_hide_cursor: false,
    display_should_clear: true,
    display_allow_shrink: true,

    debug_log: true,

    tick_timestep: (1000 / 60)
};