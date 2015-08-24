/*globals buster:false*/
buster.testCase("troopjs-opt/route/gadget", function (run) {
	"use strict";

	var assert = buster.referee.assert;
	var refute = buster.referee.refute;

	require( [ "troopjs-opt/route/gadget", "troopjs-core/pubsub/hub" ] , function (Gadget, hub) {

		run({
			"dynamic": {
				"setUp": function() {
					var tc = this;
					tc.router = Gadget.create({
						"testNav": function(pattern, data) {

							var self = this;
							var spy = tc.spy();
							var ROUTE_SET = "route/set";

							// check for route handler arguments
							function assertArgs(uri, match, foo) {
								spy(uri);
								assert.isArray(match);
								assert(match[0] === match.input );
								assert(match[0] === uri );
								assert.equals(foo, "foo");
							}

							// listen on hub and route
							hub.subscribe(ROUTE_SET, self, assertArgs);
							self.on(ROUTE_SET, assertArgs, pattern);

							return self.go.call(this, pattern, data, "foo").yield(spy).tap(function() {
								// Clean up.
								hub.unsubscribe(ROUTE_SET, self, assertArgs);
								self.unsubscribe(ROUTE_SET, assertArgs);
							});
						},
						"testRoute": function(path, uri) {

							var self = this;
							var spy = tc.spy();
							var ROUTE_CHANGE = "route/change";

							// check for arguments
							function assertArgs(uri, match, foo) {
								assert.isArray(match);
								// Spread over all matches down to spy.
								spy.apply(spy, match.slice(1));
								assert(match[0] === match.input);
								assert(match[0] === uri);
								assert.equals(foo, "foo");
							}

							self.on(ROUTE_CHANGE, assertArgs, path);

							return hub.publish("route/change", uri, "foo").tap(function() {
								self.off(ROUTE_CHANGE, assertArgs);
							}).yield(spy);
						}
					});

					return tc.router.start();
				},
				"route/set": function() {
					var router = this.router;
					var BLOG = "/blog/:id?/:search?/(page/:page)?";
					var ADDRESSBOOK_MY = "/addressbook/my/(letter/:letter)";
					var ADDRESSBOOK_USER = "/addressbook/user/(letter/:letter)";
					var ADDRESSBOOK_LABEL = "/addressbook/label/:id/(letter/:letter)";
					var ADDRESSBOOK_SEARCH = "/addressbook/search/:query(/letter/:letter)";
					var CALENDAR = "/calendar/:year?/:month?/:day?";
					var CALENDAR2 = "/calendar/(:year/:month/:day)?";

					return router.testNav(BLOG).then(function(spy) {
						assert(spy.calledWith("/blog/"), "blog [no]");
					}).then(function() {
						return router.testNav(BLOG, { id: 1 }).then(function(spy) {
							assert(spy.calledWith("/blog/1/"), "blog [id=1]");
						});
					}).then(function() {
						return router.testNav(BLOG, { id: 1, search: "abc" }).then(function(spy) {
							assert(spy.calledWith("/blog/1/abc/"), "blog [id,search]");
						});
					}).then(function() {
						return router.testNav(BLOG, { id: 1, search: "abc", page: 123 }).then(function(spy) {
							assert(spy.calledWith("/blog/1/abc/page/123/"), "/blog [id,search,page]");
						})
					}).then(function() {
						return router.testNav(ADDRESSBOOK_MY).then(function(spy) {
							assert(spy.calledWith("/addressbook/my/"), "addressbook-my [no]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_MY, { letter: 1 }).then(function(spy) {
							assert(spy.calledWith("/addressbook/my/letter/1/"), "addressbook-my [letter]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_USER).then(function(spy) {
							assert(spy.calledWith("/addressbook/user/"), "addressbook-user [no]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_USER, { letter: 2 }).then(function(spy) {
							assert(spy.calledWith("/addressbook/user/letter/2/"), "addressbook-user [letter]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_LABEL).then(function(spy) {
							assert(spy.calledWith("/addressbook/label/"), "addressbook-user [no]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_LABEL, { id: 0 }).then(function(spy) {
							assert(spy.calledWith("/addressbook/label/0/"), "addressbook-user [id]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_LABEL, { letter: 4 }).then(function(spy) {
							assert(spy.calledWith("/addressbook/label/"), "addressbook-user [letter]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_LABEL, { id: 5, letter: 6 }).then(function(spy) {
							assert(spy.calledWith("/addressbook/label/5/letter/6/"), "addressbook-user [id, letter]");
						})
					}).then(function() {
						return router.testNav(ADDRESSBOOK_SEARCH).then(function(spy) {
							assert(spy.calledWith("/addressbook/search/"), "addressbook-search [no]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_SEARCH, { query: "abc" }).then(function(spy) {
							assert(spy.calledWith("/addressbook/search/abc/"), "addressbook-search [query]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_SEARCH, { letter: "z" }).then(function(spy) {
							assert(spy.calledWith("/addressbook/search/"), "addressbook-search [letter]");
						});
					}).then(function() {
						return router.testNav(ADDRESSBOOK_SEARCH, { query: "qwerty", letter: "a" }).then(function(spy) {
							assert(spy.calledWith("/addressbook/search/qwerty/letter/a/"),
								"addressbook-search [query, letter]");
						});
					}).then(function() {
						return router.testNav(CALENDAR, { year: 2014, day: 22 }).then(function(spy) {
							assert(spy.calledWith("/calendar/2014/"), "calendar dump [month]");
						});
					}).then(function() {
						return router.testNav(CALENDAR, { month: 4, day: 22 }).then(function(spy) {
							assert(spy.calledWith("/calendar/"), "calendar dump [month] [day]");
						});
					}).then(function() {
						return router.testNav(CALENDAR, { year: 2014, month: 4, day: 22 }).then(function(spy) {
							assert(spy.calledWith("/calendar/2014/4/22/"), "calendar [year] [month] [day]");
						});
					}).then(function() {
						return router.testNav(CALENDAR2, { year: 2014 }).then(function(spy) {
							assert(spy.calledWith("/calendar/"), "calendar dump [year]");
						})
					}).then(function() {
						return router.testNav(CALENDAR2, { year: 2014, month: 4 }).then(function(spy) {
							assert(spy.calledWith("/calendar/"), "calendar dump [year] [month]");
						});
					}).then(function() {
						return router.testNav(CALENDAR2, { year: 2014, month: 4, day: 22 }).then(function(spy) {
							assert(spy.calledWith("/calendar/2014/4/22/"), "calendar [year] [month] [day]");
						});
					});
				},
				"route/change": function() {
					var router = this.router;

					// all arguments optional, last one with group.
					var BLOG = "/blog/:id?/:search?/(page/:page)?";
					// one mandatory argument with group.
					var ADDRESSBOOK_MY = "/addressbook/my/(letter/:letter)";
					// one optional argument with group, one mandatory argument.
					var ADDRESSBOOK_LABEL = "/addressbook/label/:id/(letter/:letter)?";
					var CALENDAR = "/calendar/(:year/:month/:day)?";

					return router.testRoute(BLOG, "/blog/").then(function(spy) {
						assert(spy.calledWith(undefined, undefined, undefined), "blog [no argument]" );
					}).then(function() {
						return router.testRoute(BLOG, "/blog/1/").then(function(spy) {
							assert(spy.calledWith(1, undefined, undefined), "blog [id=1]");
						});
					}).then(function() {
						return router.testRoute(ADDRESSBOOK_MY, "/addressbook/my/").then(function(spy) {
							refute(spy.called, "addressbook-my [no]");
						});
					}).then(function() {
						return router.testRoute(ADDRESSBOOK_MY, "/addressbook/my/letter/1/").then(function(spy) {
							assert(spy.calledWith(1), "addressbook-my [letter]");
						});
					}).then(function() {
						return router.testRoute(ADDRESSBOOK_LABEL, "/addressbook/label/").then(function(spy) {
							refute(spy.called, "addressbook-user [no]");
						})
					}).then(function() {
						return router.testRoute(ADDRESSBOOK_LABEL, "/addressbook/letter/6/").then(function(spy) {
							refute(spy.called, "addressbook-user [letter]");
						})
					}).then(function() {
						return router.testRoute(ADDRESSBOOK_LABEL, "/addressbook/label/3/").then(function(spy) {
							assert(spy.calledWith(3, undefined), "addressbook-user [id]");
						});
					}).then(function() {
						return router.testRoute(ADDRESSBOOK_LABEL, "/addressbook/label/5/letter/6/").then(function(spy) {
							assert(spy.calledWith(5, 6), "addressbook-user [id, letter]");
						})
					}).then(function() {
						return router.testRoute(CALENDAR, "/calendar/2014/").then(function(spy) {
							refute(spy.called, "calendar [year]");
						})
					}).then(function() {
						return router.testRoute(CALENDAR, "/calendar/2014/4/").then(function(spy) {
							refute(spy.called, "calendar [year] [month]");
						})
					}).then(function() {
						return router.testRoute(CALENDAR, "/calendar/2014/4/22/").then(function(spy) {
							assert(spy.calledWith(2014, 4, 22), "calendar [year] [month] [day]");
						})
					});
				}
			},

			"declaritive": {
				"route/change/404": function() {
					var spy = this.spy();
					var spy404 = this.spy();
					var router = Gadget.create({
						"route/change('/foo')": spy,
						"route/change/foo": spy,
						"route/change/404": spy404
					});

					return hub.publish("route/change", "/bar").then(function() {
						return router.start().then(function() {
							refute(spy.called);
							assert(spy404.calledWith("/bar"));
						});
					}).ensure(function() {
						return router.stop();
					});
				},

				"route/change": function() {
					var spy = this.spy();

					var router = Gadget.create({
						"route/change": spy,
						"route/change('/addressbook/my/(letter/:letter)?')": spy,
						"route/change/addressbook/my/(letter/:letter)": spy
					});

					return hub.publish("route/change", "/addressbook/my/letter/6/").then(function() {
						return router.start().then(function() {
							assert.equals(3, spy.callCount, "declarative route/change");
						});
					}).ensure(function() { return router.stop(); });
				},
				"route/set": function() {
					var spy = this.spy();

					function countRoutes() {
						spy();
					}

					var router = Gadget.create({
						"route/set": countRoutes,
						"route/set('/addressbook/my/(letter/:letter)?')": countRoutes,
						"route/set/addressbook/my/(letter/:letter)": countRoutes
					});

					return router.start().then(function() {
						return router.go("/addressbook/my/(letter/:letter)", { letter: 1 }).then(function() {
							assert.equals(3, spy.callCount, "declarative route/set");
						});
					});
				}
			}
		});
	});
});
