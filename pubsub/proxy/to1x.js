/**
 * @license MIT http://troopjs.mit-license.org/
 */
define([
	"troopjs-core/component/service",
	"when",
	"poly/array",
	"poly/object"
], function To1xModule(Service, when) {
	"use strict";

	/**
	 * Proxies to 1.x hub
	 * @class opt.pubsub.proxy.to1x
	 * @extend core.component.service
	 */

	var UNDEFINED;
	var ARRAY_PROTO = Array.prototype;
	var ARRAY_PUSH = ARRAY_PROTO.push;
	var ARRAY_SLICE = ARRAY_PROTO.slice;
	var OBJECT_KEYS = Object.keys;
	var OBJECT_TOSTRING = Object.prototype.toString;
	var TOSTRING_STRING = "[object String]";
	var PUBLISH = "publish";
	var SUBSCRIBE = "subscribe";
	var HUB = "hub";
	var ROUTES = "routes";
	var LENGTH = "length";
	var RESOLVE = "resolve";
	var TOPIC = "topic";
	var DEFER = "defer";
	var MEMORY = "memory";

	/**
	 * @method constructor
	 * @param {...Object} routes Routes
	 */
	return Service.extend(function To1xService(routes) {
		var config = {};

		config[ROUTES] = ARRAY_SLICE.call(arguments);

		this.configure(config);
	}, {
		"displayName" : "opt/pubsub/proxy/to1x",

		/**
		 * @inheritdoc
		 * @localdoc Initializes proxy topics
		 * @handler
		 */
		"sig/initialize" : function () {
			var me = this;

			// Iterate ROUTES
			me.configure()[ROUTES].forEach(function (routes) {
				if (!(HUB in routes)) {
					throw new Error("'" + HUB + "' is missing from routes");
				}

				var publish = routes[PUBLISH] || {};
				var subscribe = routes[SUBSCRIBE] || {};
				var hub = routes[HUB];

				// Iterate publish keys
				OBJECT_KEYS(publish).forEach(function (source) {
					// Extract target
					var target = publish[source];
					var topic;
					var defer;

					// If target is a string set topic to target and defer to false
					if (OBJECT_TOSTRING.call(target) === TOSTRING_STRING) {
						topic = target;
						defer = false;
					}
					// Otherwise just grab topic and defer from target
					else {
						// Make sure we have a topic
						if (!(TOPIC in target)) {
							throw new Error("'" + TOPIC + "' is missing from target '" + source + "'");
						}

						// Get topic
						topic = target[TOPIC];
						// Make sure defer is a boolean
						defer = !!target[DEFER];
					}

					// Create callback
					var callback = publish[source] = function () {
						// Initialize args with topic as the first argument
						var args = [ topic ];
						var deferred;
						var resolve;

						// Push original arguments on args
						ARRAY_PUSH.apply(args, ARRAY_SLICE.call(arguments));

						if (defer) {
							// Create deferred
							deferred = when.defer();

							// Store original resolve method
							resolve = deferred[RESOLVE];

							// Since the deferred implementation in jQuery (that we use in 1.x) allows
							// to resolve with multiple arguments, we monkey-patch resolve here
							deferred[RESOLVE] = deferred.resolver[RESOLVE] = function () {
								resolve(ARRAY_SLICE.call(arguments));
							};

							// Push deferred as last argument on args
							ARRAY_PUSH.call(args, deferred);
						}

						// Publish with args
						hub.publish.apply(hub, args);

						// Return promise
						return deferred
							? deferred.promise
							: UNDEFINED;
					};

					// Transfer topic and defer to callback
					callback[TOPIC] = topic;
					callback[DEFER] = defer;

					// Subscribe from me
					me.subscribe(source, callback);
				});

				// Iterate subscribe keys
				OBJECT_KEYS(subscribe).forEach(function (source) {
					// Extract target
					var target = subscribe[source];
					var topic;
					var memory;

					// If target is not a string, make it into an object
					if (OBJECT_TOSTRING.call(target) === TOSTRING_STRING) {
						topic = target;
						memory = false;
					}
					// Otherwise just grab from the properties
					else {
						// Make sure we have a topic
						if (!(TOPIC in target)) {
							throw new Error("'" + TOPIC + "' is missing from target '" + source + "'");
						}

						// Get topic
						topic = target[TOPIC];
						// Make sure memory is a boolean
						memory = !!target[MEMORY];
					}

					// Create callback
					var callback = subscribe[source] = function () {
						// Initialize args with topic as the first argument
						var args = [ topic ];
						var deferred;
						var result;

						// Push sliced (without topic) arguments on args
						ARRAY_PUSH.apply(args, ARRAY_SLICE.call(arguments, 1));

						// If the last argument look like a promise we pop and store as deferred
						if (when.isPromiseLike(args[args[LENGTH] - 1])) {
							deferred = args.pop();
						}

						// Publish and store promise as result
						result = me.publish.apply(me, args);

						// If we have a deferred we should chain it to result
						if (deferred) {
							when(result, when.apply(deferred.resolve), deferred.reject, deferred.progress);
						}

						// Return result
						return result;
					};

					// Transfer topic and memory to callback
					callback[TOPIC] = topic;
					callback[MEMORY] = memory;

					// Subscribe from hub,notice that since we're pushing memory there _is_ a chance that
					// we'll get a callback before sig/start
					hub.subscribe(source, me, memory, callback);
				});
			});
		},

		/**
		 * @inheritdoc
		 * @localdoc Finalizes proxy topics
		 * @handler
		 */
		"sig/finalize" : function () {
			var me = this;

			// Iterate ROUTES
			me.configure()[ROUTES].forEach(function (routes) {
				if (!(HUB in routes)) {
					throw new Error("'" + HUB + "' is missing from routes");
				}

				var publish = routes[PUBLISH] || {};
				var subscribe = routes[SUBSCRIBE] || {};
				var hub = routes[HUB];

				// Iterate publish keys and unsubscribe
				OBJECT_KEYS(publish).forEach(function (source) {
					me.unsubscribe(source, publish[source]);
				});

				// Iterate subscribe keys and unsubscribe
				OBJECT_KEYS(subscribe).forEach(function (source) {
					hub.unsubscribe(source, me, subscribe[source]);
				});
			});
		}
	});
});