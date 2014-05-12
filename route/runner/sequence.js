/**
 * @license MIT http://troopjs.mit-license.org/
 */
define([ "poly/array" ], function SequenceModule() {
	"use strict";

	/**
	 * @class opt.route.runner.sequence
	 * @implement core.event.emitter.runner
	 * @private
	 * @static
	 * @alias feature.runner
	 */

	var UNDEFINED;
	var NULL = null;
	var OBJECT_TOSTRING = Object.prototype.toString;
	var CONTEXT = "context";
	var CALLBACK = "callback";
	var DATA = "data";
	var HEAD = "head";
	var NEXT = "next";
	var TYPE = "type";
	var TOKENS = "tokens";

	var RE_GROUP_START = /\(/g;
	var RE_TOKEN = /\:(\w+)(\?)?\/?/g;
	var RE_TOKEN_ESCAPED = /@(\w+)(\?)?\/?/g;
	var RE_COLON = /\:/g;
	var MARKER = "@";
	var RE_GROUPED_TOKEN = /\(([^)]+)\)\??\/?/g;
	var RE_ANY = /^.*$/;
	var RE_ESCAPE_REGEXP = /([\/.])/g;
	var RE_DUP_SLASH = /\/{2,}/;

	var RE_BOOLEAN = /^(?:false|true)$/i;
	var RE_BOOLEAN_TRUE = /^true$/i;
	var RE_DIGIT = /^\d+$/;

	/**
	 * @method constructor
	 * @inheritdoc
	 * @localdoc Runner that executes ROUTE candidates in sequence without overlap
	 * @return {*} Result from last handler
	 * @throws {Error} If `event.type` is an unknown type
	 */
	return function sequence(event, handlers, args) {
		var type = event[TYPE];
		var path = args.shift(); // Shift path and route of args
		var data;
		var matched;
		var candidate;
		var candidates = [];
		var fallbacks = [];
		var first_missed;

		// If this is a route/set we need to pre-process the path
		if (type === "route/set") {
			// route data is provided as the second arg, but we're already shifted above.
			data = args.shift() || {};

			// Populate path with data
			path = path
				// Replace grouped tokens.
				.replace(RE_GROUPED_TOKEN, function ($0, $1) {
					var group = $1.replace(RE_TOKEN, function($0, $1) {
						return $1 in data ? data[$1] + "/" : $0;
					});
					// mark the group as missed unless all params within have fulfilled.
					return !group.match(RE_COLON)? group + "/" : MARKER;
				})
				// Replace the rest of tokens.
				.replace(RE_TOKEN, function($0, $1) {
					// mark the parameters as missed.
					return $1 in data ? data[$1] + "/" : MARKER;
				})
				// Remove any duplicate slashes previously produced.
				.replace(RE_DUP_SLASH, "/");

			// Dump from before the first missed parameter.
			if ((first_missed = path.indexOf(MARKER)) > -1) {
				path = path.substring(0, first_missed);
			}
		}
		// If this is _not_ a route/change we should throw an error
		else if (type !== "route/change") {
			throw new Error("Unable to run type '" + type + "'");
		}

		// Copy handlers -> candidates
		for (candidate = handlers[HEAD]; candidate !== UNDEFINED; candidate = candidate[NEXT]) {
			candidate[DATA] === "/404" ? fallbacks.push(candidate) : candidates.push(candidate);
		}

		// Run candidates and return
		var result = candidates.reduce(function(result, candidate) {
			var tokens;
			var matches;
			var re;

			// Only run if the reduced result is not `false`
			if (result !== false) {
				switch (OBJECT_TOSTRING.call(candidate[DATA])) {
					case "[object RegExp]":
						// Use cached regexp
						re = candidate[DATA];

						// Use cached tokens
						tokens = candidate[TOKENS];
						break;

					case "[object Undefined]":
					// phantom reported weird [object DOMWindow] for undefined property.
					case "[object DOMWindow]":
						// Match anything
						re = RE_ANY;

						// Empty tokens
						tokens = [];
						break;

					default:
						// Reset tokens
						tokens = candidate[TOKENS] = [];

						// Translate and cache pattern to regexp
						re = candidate[DATA] = new RegExp("^" + candidate[DATA]
							// Preserved colon to be used by regexp.
							.replace(RE_COLON, MARKER)
							// Translate grouping to non capturing regexp groups
							.replace(RE_GROUP_START, "(?:")
							// Capture tokens
							.replace(RE_TOKEN_ESCAPED, function($0, token, optional) {
								// Add token
								tokens.push(token);
								// Return replacement.
								return "(?:(\\w+)\/)" + (optional ? "?" : "");
							})
							.replace(RE_ESCAPE_REGEXP, "\\$1") + "$", "i");
				}

				// Match path
				if ((matches = re.exec(path)) !== NULL) {
					// Capture tokens in data
					tokens.forEach(function(token, index) {

						// Auto type convertion.
						var val = matches[index + 1];
						if (RE_BOOLEAN.test(val)) {
							val = RE_BOOLEAN_TRUE.test(val);
						}
						else if (RE_DIGIT.test(val)) {
							val = +val;
						}

						matches[index + 1] = matches[token] = val;
					});

					if (!matched) {
						matched = 1;
					}

					// Apply CALLBACK and store in result
					result = candidate[CALLBACK].apply(candidate[CONTEXT], [ path, matches ].concat(args));
				}
			}

			return result;
		}, UNDEFINED);

		// Run 404s if none of the candidate matches the route.
		if (!matched && type === "route/change") {
			return fallbacks.reduce(function(result, candidate) {
				result !== false ? candidate[CALLBACK].apply(candidate[CONTEXT], [ path ].concat(args)) : result;
			}, result);
		}

		return result;
	};
});
