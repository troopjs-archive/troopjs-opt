/**
 * @license MIT http://troopjs.mit-license.org/
 */
define([
	"troopjs-core/mixin/base",
	"when",
	"poly/array"
], function StoreModule(Base, when) {
	"use strict";

	/**
	 * A simple key-value store that supports **dot separated key** format.
	 * @class opt.store.component
	 * @extend core.mixin.base
	 */

	var UNDEFINED;
	var OBJECT_TOSTRING = Object.prototype.toString;
	var TOSTRING_ARRAY = "[object Array]";
	var TOSTRING_OBJECT = "[object Object]";
	var TOSTRING_FUNCTION = "[object Function]";
	var TOSTRING_STRING = "[object String]";
	var ARRAY_SLICE = Array.prototype.slice;
	var LENGTH = "length";
	var ADAPTERS = "adapters";
	var STORAGE = "storage";
	var BEFORE_GET = "beforeGet";
	var AFTER_PUT = "afterPut";
	var CLEAR = "clear";
	var LOCKS = "locks";

	/**
	 * Applies method to this (if it exists)
	 * @param {String} method Method name
	 * @return {Boolean|*}
	 * @ignore
	 */
	function applyMethod(method) {
		/*jshint validthis:true*/
		var me = this;

		return method in me && me[method].apply(me, ARRAY_SLICE.call(arguments, 1));
	}

	/**
	 * Puts value
	 * @param {String|null} key Key - can be dot separated for sub keys
	 * @param {*} value Value
	 * @return {Promise} Promise of put
	 * @ignore
	 */
	function put(key, value) {
		/*jshint validthis:true*/
		var me = this;
		var node = me[STORAGE];
		var parts = key
			? key.split(".")
			: [];
		var part;
		var last = parts.pop();

		while (node && (part = parts.shift())) {
			switch (OBJECT_TOSTRING.call(node)) {
				case TOSTRING_ARRAY :
				/* falls through */

				case TOSTRING_OBJECT :
					if (part in node) {
						node = node[part];
						break;
					}
				/* falls through */

				default :
					node = node[part] = {};
			}
		}

		// Evaluate value if needed
		if (OBJECT_TOSTRING.call(value) === TOSTRING_FUNCTION) {
			value = value.call(me, {
				"get" : function () {
					return get.apply(me, arguments);
				},
				"has" : function () {
					return has.apply(me, arguments);
				}
			}, key);
		}

		return last !== UNDEFINED
			// First store the promise, then override with the true value once resolved
			? when(value, function (result) {
				node[last] = result;

				return result;
			})
			// No key provided, just return a promise of the value
			: when(value);
	}

	/**
	 * Gets value
	 * @param {String} key Key - can be dot separated for sub keys
	 * @return {*} Value
	 * @ignore
	 */
	function get(key) {
		/*jshint validthis:true*/
		var node = this[STORAGE];
		var parts = key.split(".");
		var part;

		while (node && (part = parts.shift())) {
			switch (OBJECT_TOSTRING.call(node)) {
				case TOSTRING_ARRAY :
				/* falls through */

				case TOSTRING_OBJECT :
					if (part in node) {
						node = node[part];
						break;
					}
				/* falls through */

				default :
					node = UNDEFINED;
			}
		}

		return node;
	}

	/**
	 * Check is key exists
	 * @param key {String} key Key - can be dot separated for sub keys
	 * @return {Boolean}
	 * @ignore
	 */
	function has(key) {
		/*jshint validthis:true*/
		var node = this[STORAGE];
		var parts = key.split(".");
		var part;
		var last = parts.pop();

		while (node && (part = parts.shift())) {
			switch (OBJECT_TOSTRING.call(node)) {
				case TOSTRING_ARRAY :
				/* falls through */

				case TOSTRING_OBJECT :
					if (part in node) {
						node = node[part];
						break;
					}
				/* falls through */

				default :
					node = UNDEFINED;
			}
		}

		return node !== UNDEFINED && last in node;
	}

	/**
	 * @method constructor
	 * @param {...Object} adapter One or more adapters
	 * @throws {Error} If no adapter was provided
	 */
	return Base.extend(function StoreComponent(adapter) {
		if (arguments[LENGTH] === 0) {
			throw new Error("No adapter(s) provided");
		}

		var me = this;

		/**
		 * Current adapters
		 * @private
		 * @readonly
		 * @property {Array} adapters
		 */
		me[ADAPTERS] = ARRAY_SLICE.call(arguments);

		/**
		 * Current storage
		 * @private
		 * @readonly
		 * @property {Object} storage
		 */
		me[STORAGE] = {};

		/**
		 * Current locks
		 * @private
		 * @readonly
		 * @property {Object} locks
		 */
		me[LOCKS] = {};
	}, {
		"displayName" : "opt/store/component",

		/**
		 * Waits for store to be "locked"
		 * @param {String} key Key
		 * @return {Promise} Promise of ready
		 */
		"lock" : function (key) {
			var locks = this[LOCKS];

			if (OBJECT_TOSTRING.call(key) !== TOSTRING_STRING) {
				throw new Error("key has to be of type string");
			}

			return (locks[key] = when(locks[key]));
		},

		/**
		 * Gets state value
		 * @param {...String} key Key - can be dot separated for sub keys
		 * @return {Promise} Promise of value
		 */
		"get" : function (key) {
			/*jshint curly:false*/
			var me = this;
			return when.map(ARRAY_SLICE.call(arguments), function (key) {
					return when
						// Map adapters and BEFORE_GET on each adapter
						.map(me[ADAPTERS], function (adapter) {
							return when(applyMethod.call(adapter, BEFORE_GET, me, key));
						})
						// Get value from STORAGE
						.then(function() {
							return get.call(me, key);
						});
				});
		},

		/**
		 * Puts state value
		 * @param {String} key Key - can be dot separated for sub keys
		 * @param {*} value Value
		 * @return {Promise} Promise of value
		 */
		"put" : function (key, value) {
			var me = this;

			return when(put.call(me, key, value), function (result) {
				return when
					// Map adapters and AFTER_PUT on each adapter
					.map(me[ADAPTERS], function (adapter) {
						return when(applyMethod.call(adapter, AFTER_PUT, me, key, result));
					})
					.yield(result);
			})
		},

		/**
		 * Puts state value if key is UNDEFINED
		 * @param {String} key Key - can be dot separated for sub keys
		 * @param {*} value Value
		 * @return {Promise} Promise of value
		 */
		"putIfNotHas" : function (key, value) {
			var me = this;

			return !me.has(key)
				? me.put(key, value)
				: when(UNDEFINED);
		},

		/**
		 * Checks if key exists
		 * @param {String} key Key - can be dot separated for sub keys
		 * @return {Boolean} True if key exists, otherwise false
		 */
		"has" : function (key) {
			return has.call(this, key);
		},

		/**
		 * Clears all adapters
		 * @return {Promise} Promise of clear
		 */
		"clear" : function () {
			var me = this;
			return when
				.map(me[ADAPTERS], function (adapter) {
					return when(applyMethod.call(adapter, CLEAR, me));
				});
		}
	});
});
