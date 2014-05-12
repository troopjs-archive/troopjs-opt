/**
 * @license MIT http://troopjs.mit-license.org/
 */
define([
	"troopjs-compose/mixin/config",
	"troopjs-core/component/gadget",
	"./runner/sequence",
	"when"
], function (COMPOSE_CONF, Gadget, sequence, when) {
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
	var ARGS = "args";
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
	 * To change the current route
	 * @event hub/route/set
	 * @param {String} The new uri
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

	// Add pragma for ROUTE special
	COMPOSE_CONF.pragmas.push({
		"pattern": /^route\/(change|set)(\/.*)?$/,
		"replace": ROUTE + "/$1(\"$2\")"
	});

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
				return me.on(special[NAME], special[VALUE], special[ARGS][0] || undefined);
			});
		},

		/**
		 * @handler hub/route/change
		 * @param {String} uri The new URI.
		 * Handles URI change to dispatch it to individual handlers by emitting a {@link #event-route/change} event
		 * synchronously, call each handler when the pattern matches the new URI.
		 */
		"hub:memory/route/change": function onHashChange(uri) {
			var me = this;
			var args = [ "change" ];
			ARRAY_PUSH.apply(args, arguments);
			return me.task(function(resolve) {
				resolve(runRoute.apply(me, args));
			}, ROUTE + "/change");
		},

		/**
		 * Handles route set
		 * @handler
		 * @inheritdoc #event-route/set
		 * @localdoc Translates {@link #event-route/set} to {@link dom.hash.widget#event-hub/hash/set}
		 * @fires hub/route/set
		 */
		"route/set": function onRouteSet(route, data) {
			var me = this;
			var args = [ "route/set" ];
			ARRAY_PUSH.apply(args, arguments);
			return this.publish.apply(me, args);
		},

		/**
		 * Navigate to a new URI by fulfill the route parameters with the specified list of values, after emitting
		 * a {@link #event-route/set} event synchronously, call each handler whose route pattern where the pattern matches it.
		 *
		 * @param {String} pattern The route pattern to construct the new route.
		 * @param {Object} params The data object contains the parameter values for routing.
		 * @return {Promise}
		 * @fires route/set
		 */
		"go": function go(pattern, params) {
			var me = this;
			var args = [ "set" ];
			ARRAY_PUSH.apply(args, arguments);
			return me.task(function (resolve) {
				resolve(runRoute.apply(me, args));
			}, ROUTE + "/set");
		}
	});
});
