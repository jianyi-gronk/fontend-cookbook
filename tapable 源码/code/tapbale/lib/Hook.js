/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");

/**
 * 调用 deprecateContext 时，会执行第一个参数，然后控制台输出第二个参数警告
 * 这里的第一个参数是一个空函数，因此只是单纯为了提醒开发者，Hook.context 已经废弃
 */
const deprecateContext = util.deprecate(
	() => {},
	"Hook.context is deprecated and will be removed"
);

/**
 * 该函数同时包含 编译 和 执行
 * 作用是 延迟编译，直到第一次调用 call 方法时才执行 compile 方法编译具体执行逻辑
 * 如果修改了 拦截器 或 注册插件，需要重新编译 call 函数
 */
function CALL_DELEGATE(...args) {
	this.call = this._createCall("sync");
	return this.call(...args);
}
function CALL_ASYNC_DELEGATE(...args) {
	this.callAsync = this._createCall("async");
	return this.callAsync(...args);
}
function PROMISE_DELEGATE(...args) {
	this.promise = this._createCall("promise");
	return this.promise(...args);
}

/**
 * Hook 是 tapable 的基类
 * 保存钩子的参数、名称、已注册的插件（ taps ）和拦截器（ interceptors ）
 * 提供 tap/tapAsync/tapPromise 等注册方法
 * 提供 call/callAsync/promise 等触发方法（延迟编译）
 * 子类通过实现 compile 方法生成具体执行函数
 */
class Hook {
	constructor(args = [], name = undefined) {
		this._args = args; // 参数
		this.name = name; // 钩子名称
		this.taps = []; // 插件

		/**
		 * 拦截器存在 register，call，loop，tap，error，result，done 七种方法，分别在不同时机被调用
		 */
		this.interceptors = []; // 拦截器

		/**
		 * 声明两次的原因是
		 * 1. 带下划线声明：原始默认实现，不会被改变
		 * 2. 不带下划线声明：实际对外暴露的触发方法
		 */
		this._call = CALL_DELEGATE;
		this.call = CALL_DELEGATE;
		this._callAsync = CALL_ASYNC_DELEGATE;
		this.callAsync = CALL_ASYNC_DELEGATE;
		this._promise = PROMISE_DELEGATE;
		this.promise = PROMISE_DELEGATE;

		this._x = undefined;

		/**
		 * 因为通常实例方法会放到类的原型对象上，而不是直接放在实例本身
		 * 这里的重新赋值是为了把方法移到实例身上，防止修改到原型上方法，导致其他实例受到影响
		 */
		// eslint-disable-next-line no-self-assign
		this.compile = this.compile;
		// eslint-disable-next-line no-self-assign
		this.tap = this.tap;
		// eslint-disable-next-line no-self-assign
		this.tapAsync = this.tapAsync;
		// eslint-disable-next-line no-self-assign
		this.tapPromise = this.tapPromise;
	}

	/**
	 * 抽象方法，子类必须实现
	 * 根据当前 taps、interceptors、type（ sync/async/promise ）等信息，动态生成一个高效的钩子执行函数并返回
	 */
	compile(_options) {
		throw new Error("Abstract: should be overridden");
	}

	/*
	 * 调用子类的 compile 方法生成真正的执行函数
	 */
	_createCall(type) {
		return this.compile({
			taps: this.taps,
			interceptors: this.interceptors,
			args: this._args,
			type
		});
	}

	/**
	 * 内部通用注册方法，用于注册同步、异步、Promise 插件
	 * options 是插件注册时传入的配置对象，决定了插件的名称、执行顺序、类型等关键行为
	 */
	_tap(type, options, fn) {
		if (typeof options === "string") {
			options = {
				name: options
			};
		} else if (typeof options !== "object" || options === null) {
			throw new Error("Invalid tap options");
		}
		if (typeof options.name === "string") {
			options.name = options.name.trim();
		}
		if (typeof options.name !== "string" || options.name === "") {
			throw new Error("Missing name for tap");
		}

		// 如果开发者使用了 context 参数，则提示开发者 context 属性已废弃
		if (typeof options.context !== "undefined") {
			deprecateContext();
		}

		// 将 tap 的 type 和 执行函数 合并到 options 中
		options = Object.assign({ type, fn }, options);

		// 每个插件注册前，都会经过所有已注册拦截器的处理
		// 因为这个时候有 fn，因此可以在执行函数前后做操作
		options = this._runRegisterInterceptors(options);

		this._insert(options);
	}

	/**
	 * 公开的注册 api，注册同步插件
	 */
	tap(options, fn) {
		this._tap("sync", options, fn);
	}

	/**
	 * 公开的注册 api，注册回调式异步插件
	 */
	tapAsync(options, fn) {
		this._tap("async", options, fn);
	}

	/**
	 * 公开的注册 api，注册 Promise 式异步插件
	 */
	tapPromise(options, fn) {
		this._tap("promise", options, fn);
	}

	/**
	 * 遍历所有拦截器，执行它们的 register 方法
	 */
	_runRegisterInterceptors(options) {
		for (const interceptor of this.interceptors) {
			if (interceptor.register) {
				const newOptions = interceptor.register(options);
				if (newOptions !== undefined) {
					options = newOptions;
				}
			}
		}
		return options;
	}

	/**
	 * 返回一个新的包含所有 Hook 方法的对象，参数为 默认 options
	 * 包含 Hook 相同功能的注册方法，但所有方法会自动合并默认 options
	 * 支持链式调用，可以 hook.withOptions(xxx).withOptions(xxx)
	 */
	withOptions(options) {
		const mergeOptions = (opt) =>
			Object.assign({}, options, typeof opt === "string" ? { name: opt } : opt);

		return {
			name: this.name,
			tap: (opt, fn) => this.tap(mergeOptions(opt), fn),
			tapAsync: (opt, fn) => this.tapAsync(mergeOptions(opt), fn),
			tapPromise: (opt, fn) => this.tapPromise(mergeOptions(opt), fn),
			intercept: (interceptor) => this.intercept(interceptor),
			isUsed: () => this.isUsed(),
			withOptions: (opt) => this.withOptions(mergeOptions(opt))
		};
	}

	/**
	 * 判断当前钩子是否有插件或拦截器注册
	 */
	isUsed() {
		return this.taps.length > 0 || this.interceptors.length > 0;
	}

	/**
	 * 注册拦截器
	 */
	intercept(interceptor) {
		this._resetCompilation();
		this.interceptors.push(Object.assign({}, interceptor));

		// 注册拦截器的时候，会对所有已注册插件进行执行一次 register 处理
		if (interceptor.register) {
			for (let i = 0; i < this.taps.length; i++) {
				this.taps[i] = interceptor.register(this.taps[i]);
			}
		}
	}

	/**
	 * 在修改 拦截器 或 注册插件 时，重置 call、callAsync、promise 函数
	 * 因为需要重新编译 call 函数
	 */
	_resetCompilation() {
		this.call = this._call;
		this.callAsync = this._callAsync;
		this.promise = this._promise;
	}

	/**
	 * 将新 tap 按规则插入 taps 数组的正确位
	 * 支持两种排序方式：
	 *   stage：数值越小越靠前（ 默认 0 ）
	 *   before：指定必须在某些已注册插件之前（ 支持字符串或数组 ）
	 * 在排序中 before 优先级高于 stage
	 * 通过 before 提前的排序不会影响 stage 排序，因为 before 提前的 tap 的 stage 一定小于等于当前 tap 的 stage
	 */
	_insert(item) {
		this._resetCompilation();

		// 处理 before
		let before;
		if (typeof item.before === "string") {
			before = new Set([item.before]);
		} else if (Array.isArray(item.before)) {
			before = new Set(item.before);
		}
		if (before) {
			for (const name of before) {
				if (!this.taps.some((tap) => tap.name === name)) {
					before.delete(name);
				}
			}
		}

		// 处理 stage
		let stage = 0;
		if (typeof item.stage === "number") {
			stage = item.stage;
		}

		let i = this.taps.length;
		while (i > 0) {
			i--;
			const tap = this.taps[i];
			this.taps[i + 1] = tap;
			const xStage = tap.stage || 0;
			if (before) {
				if (before.has(tap.name)) {
					before.delete(tap.name);
					continue;
				}
				if (before.size > 0) {
					continue;
				}
			}
			if (xStage > stage) {
				continue;
			}
			i++;
			break;
		}
		this.taps[i] = item;
	}
}

/**
 * 主要原因：设置原型为 null，防止原型链污染
 * 附加原因：可以避免在原型链上查找属性和方法，从而提高性能（ 差距有限 ）
 */
Object.setPrototypeOf(Hook.prototype, null);

module.exports = Hook;
