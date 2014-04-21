/**
 * @license MIT http://troopjs.mit-license.org/
 */
define([
	"troopjs-core/component/gadget",
	"./runner/sequence",
	"when"
], function (Gadget, sequence, when) {
	"use strict";

	/**
	 * @class opt.route.gadget
	 * @extend core.component.gadget
	 */

	var ARRAY_PROTO = Array.prototype;
	var ARRAY_PUSH = ARRAY_PROTO.push;
	var ROUTE = "route";
	var NAME = "name";
	var TYPE = "type";
	var VALUE = "value";
	var FEATURES = "features";
	var RUNNER = "runner";

	/**
	 * Route set event
	 * @localdoc Triggered when a route set is requested
	 * @event route/set
	 * @param {String} route Route
	 * @param {Object} data Data
	 * @param {...*} [args] Additional arguments
	 * @preventable
	 */

	/**
	 * Route change event
	 * @localdoc Triggered when a route change is requested
	 * @event route/change
	 * @param {String} route Route
	 * @param {String[]} data Data
	 * @param {...*} [args] Additional arguments
	 * @preventable
	 */

	/**
	 * Route change handler
	 * @handler route/change
	 * @inheritdoc #event-route/change
	 * @localdoc Matches and executes route stored in data
	 * @template
	 * @return {*}
	 */

	/**
	 * Runs routes
	 * @ignore
	 * @param {String} op Operation
	 * @param {...*} [args] Additional arguments
	 * @return {*} Result from last handler
	 */
	function runRoute(op) {
		var me = this;

		// Prepare event object
		var event = {};
		event[TYPE] = ROUTE + "/" + op;
		event[RUNNER] = sequence;

		// Modify first argument
		arguments[0] = event;

		// Delegate the actual emitting to emit
		return me.emit.apply(me, arguments);
	}

	return Gadget.extend({
		"displayName" : "opt/route/gadget",

		/**
		 * @handler
		 * @inheritdoc
		 * @localdoc Registers event handlers declared ROUTE specials
		 */
		"sig/initialize": function onInitialize() {
			var me = this;

			return when.map(me.constructor.specials[ROUTE] || ARRAY_PROTO, function (special) {
				return me.on(special[NAME], special[VALUE], special[FEATURES]);
			});
		},

		/**
		 * @handler hub/hash/change
		 * @inheritdoc dom.hash.widget
		 * @localdoc Translates {@link dom.hash.widget#event-hub/hash/change} to a `route/change` task
		 * @fires route/change
		 */
		"hub:memory/hash/change": function onHashChange(hash) {
			this.route(hash);
		},

		/**
		 * Handles route set
		 * @handler
		 * @inheritdoc #event-route/set
		 * @localdoc Translates {@link #event-route/set} to {@link dom.hash.widget#event-hub/hash/set}
		 * @fires dom.hash.widget#event-hub/hash/set
		 */
		"route/set": function onRouteSet(route, data) {
			return this.publish("hash/set", data["input"]);
		},

		"route": function() {
			var me = this;
			var args = [ "change" ];
			ARRAY_PUSH.apply(args, arguments);
			return me.task(function(resolve) {
				resolve(runRoute.apply(me, args));
			}, ROUTE + "/change");
		},

		/**
		 * Changes the current route
		 * @inheritdoc #handler-route/set
		 * @return {Promise}
		 * @fires route/set
		 */
		"nav": function nav(route, data) {
			var me = this;
			var args = [ "set" ];
			ARRAY_PUSH.apply(args, arguments);
			return me.task(function (resolve) {
				resolve(runRoute.apply(me, args));
			}, ROUTE + "/set");
		}
	});
});