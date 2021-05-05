export class AlignOption {
	public start?: boolean = false;
	public center?: boolean = false;
	public right?: boolean = false;
	public left?: boolean = false;
	public end?: boolean = false;
};


export class Viewport {
	public cameraX: number;
	public cameraY: number;
	public scale: number;
}

/** ------------------------------------------------------------------------ **/
/* *
/* * Static easing functions adapted from Rober Penner(http://robertpenner.com/easing/)
/* *
/** ------------------------------------------------------------------------ **/

export class StaticEasingFuncs {
	// TODO: Keep a internal clock instead of passing timestep each iteration.
	// Time has to be in the range [0...1]
	public static currentTimestep: number = 0;
	public static tween(easingFn: Function, time: number, duration: number) {
		return this.performTween(easingFn, time, 0, 1, duration);
	}

	public static performTween(easingFn: Function, time: number, beginValue: number, endValue: number, duration: number) {
		return easingFn(time, beginValue, endValue - beginValue, duration);
	}

	public static Quad = {
		easeIn: (t: number, b: number, c: number, d: number) => {
			return c * (t /= d) * t + b;
		},
		easeOut: (t: number, b: number, c: number, d: number) => {
			return -c * (t /= d) * (t - 2) + b;
		},
		easeInOut: (t: number, b: number, c: number, d: number) => {
			if ((t /= d / 2) < 1) return c / 2 * t * t + b;
			return -c / 2 * ((--t) * (t - 2) - 1) + b;
		}
	};

	public static Cubic = {
		easeIn: (t: number, b: number, c: number, d: number) => {
			return c * (t /= d) * t * t + b;
		},
		easeOut: (t: number, b: number, c: number, d: number) => {
			return c * ((t = t / d - 1) * t * t + 1) + b;
		},
		easeInOut: (t: number, b: number, c: number, d: number) => {
			if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
			return c / 2 * ((t -= 2) * t * t + 2) + b;
		}
	};

	public static Quart = {
		easeIn: (t: number, b: number, c: number, d: number) => {
			return c * (t /= d) * t * t * t + b;
		},
		easeOut: (t: number, b: number, c: number, d: number) => {
			return -c * ((t = t / d - 1) * t * t * t - 1) + b;
		},
		easeInOut: (t: number, b: number, c: number, d: number) => {
			if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
			return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
		}
	};

	public static Quint = {
		easeIn: (t: number, b: number, c: number, d: number) => {
			return c * (t /= d) * t * t * t * t + b;
		},
		easeOut: (t: number, b: number, c: number, d: number) => {
			return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
		},
		easeInOut: (t: number, b: number, c: number, d: number) => {
			if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
			return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
		}
	};

	public static Sine = {
		easeIn: (t: number, b: number, c: number, d: number) => {
			return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
		},
		easeOut: (t: number, b: number, c: number, d: number) => {
			return c * Math.sin(t / d * (Math.PI / 2)) + b;
		},
		easeInOut: (t: number, b: number, c: number, d: number) => {
			return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
		}
	};
}
