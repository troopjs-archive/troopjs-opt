/*globals buster:false*/
buster.testCase("troopjs-opt/route/gadget", function (run) {
	"use strict";

	var assert = buster.referee.assert;
	var refute = buster.referee.refute;

	require( [ "troopjs-opt/route/gadget" ] , function (Gadget) {

		run({
			"setUp": function() {
				var tc = this;
				tc.router = Gadget.create({
					"testNav": function() {
						var self = this;
						self.nav.apply(this, arguments);
						return this.hash;
					},
					"testRoute": function(path, uri) {
						var self = this;
						var spy = tc.spy();
						var ROUTE_CHANGE = "route/change";
						self.on(ROUTE_CHANGE, function() {
							self.off(ROUTE_CHANGE);
							// Send all matches down to spy.
							spy.apply(spy, arguments);
						}, path);
						self.route.call(self, uri);
						return spy;
					},
					"route/set": function(data) {
						this.hash = data["input"];
					}
				});

				return tc.router.start();
			},
			"route/set": function() {
				var router = this.router;
				return;
				var BLOG = '/blog/:id?/:search?/(page/:page)?';
				var ADDRESSBOOK_MY = '/addressbook/my/(letter/:letter)';
				var ADDRESSBOOK_USER = '/addressbook/user/(letter/:letter)';
				var ADDRESSBOOK_LABEL = '/addressbook/label/:id/(letter/:letter)';
				var ADDRESSBOOK_SEARCH = '/addressbook/search/:query(/letter/:letter)';
				var CALENDAR = '/calendar/:year?/:month?/:day?';
				var CALENDAR2 = '/calendar/(:year/:month/:day)?';

				assert.equals(router.testNav(BLOG), '/blog/', 'blog [no]');
				assert.equals(router.testNav(BLOG, { id: 1 }), '/blog/1/', 'blog [id=1]');
				assert.equals(router.testNav(BLOG, { id: 1, search: 'abc' }), '/blog/1/abc/', 'blog [id,search]');
				assert.equals(router.testNav(BLOG, { id: 1, search: 'abc', page: 123 }),
					'/blog/1/abc/page/123/',
					'/blog [id,search,page]');

				assert.equals(router.testNav(ADDRESSBOOK_MY), '/addressbook/my/', 'addressbook-my [no]');
				assert.equals(router.testNav(ADDRESSBOOK_MY, { letter: 1 }),
					'/addressbook/my/letter/1/',
					'addressbook-my [letter]');

				assert.equals(router.testNav(ADDRESSBOOK_USER), '/addressbook/user/', 'addressbook-user [no]');
				assert.equals(router.testNav(ADDRESSBOOK_USER, { letter: 2 }),
					'/addressbook/user/letter/2/',
					'addressbook-user [letter]');

				assert.equals(router.testNav(ADDRESSBOOK_LABEL), '/addressbook/label/', 'addressbook-user [no]');
				assert.equals(router.testNav(ADDRESSBOOK_LABEL, { id: 3 }), '/addressbook/label/3/', 'addressbook-user [id]');
				assert.equals(router.testNav(ADDRESSBOOK_LABEL, { letter: 4 }),
					'/addressbook/label/',
					'addressbook-user [letter]');
				assert.equals(router.testNav(ADDRESSBOOK_LABEL, { id: 5, letter: 6 }),
					'/addressbook/label/5/letter/6/',
					'addressbook-user [id, letter]');

				assert.equals(router.testNav(ADDRESSBOOK_SEARCH), '/addressbook/search/', 'addressbook-search [no]');
				assert.equals(router.testNav(ADDRESSBOOK_SEARCH, { query: 'abc' }),
					'/addressbook/search/abc/',
					'addressbook-search [query]');
				assert.equals(router.testNav(ADDRESSBOOK_SEARCH, { letter: 'z' }),
					'/addressbook/search/',
					'addressbook-search [letter]');
				assert.equals(router.testNav(ADDRESSBOOK_SEARCH, { query: 'qwerty', letter: 'a' }),
					'/addressbook/search/qwerty/letter/a/', 'addressbook-search [query, letter]');

				assert.equals(router.testNav(CALENDAR, { year: 2014, day: 22 }), '/calendar/2014/', 'calendar dump [month]');
				assert.equals(router.testNav(CALENDAR, { month: 4, day: 22 }), '/calendar/', 'calendar dump [month] [day]');
				assert.equals(router.testNav(CALENDAR, { year: 2014, month: 4, day: 22 }), '/calendar/2014/4/22/', 'calendar [year] [month] [day]');

				assert.equals(router.testNav(CALENDAR2, { year: 2014 }), '/calendar/', 'calendar dump [year]');
				assert.equals(router.testNav(CALENDAR2, { year: 2014, month: 4 }), '/calendar/', 'calendar dump [year] [month]');
				assert.equals(router.testNav(CALENDAR2, { year: 2014, month: 4, day: 22 }), '/calendar/2014/4/22/', 'calendar [year] [month] [day]');
			},
			"route/change": function() {
				var router = this.router;

				// all arguments optional, last one with group.
				var BLOG = '/blog/:id?/:search?/(page/:page)?';
				// one mandatory argument with group.
				var ADDRESSBOOK_MY = '/addressbook/my/(letter/:letter)';
				// one optional argument with group, one mandatory argument.
				var ADDRESSBOOK_LABEL = '/addressbook/label/:id/(letter/:letter)?';
				var CALENDAR = '/calendar/(:year/:month/:day)?';

				assert(router.testRoute(BLOG, '/blog/').calledWith(undefined, undefined, undefined), 'blog [no argument]');
				return;
				assert(router.testRoute(BLOG, '/blog/1/').calledWith(1, undefined, undefined), 'blog [id=1]');
				assert(router.testRoute(BLOG, '/blog/1/abc/').calledWith(1, 'abc', undefined), 'blog [id,search]');
				assert(router.testRoute(BLOG, '/blog/1/abc/page/123/').calledWith(1, 'abc', 123), '/blog [id,search,page]');

				refute(router.testRoute(ADDRESSBOOK_MY, '/addressbook/my/').called, 'addressbook-my [no]');
				assert(router.testRoute(ADDRESSBOOK_MY, '/addressbook/my/letter/1/').calledWith(1), 'addressbook-my [letter]');

				refute(router.testRoute(ADDRESSBOOK_LABEL, '/addressbook/label/').called, 'addressbook-user [no]');
				refute(router.testRoute(ADDRESSBOOK_LABEL, '/addressbook/letter/6/').called, 'addressbook-user [letter]');
				assert(router.testRoute(ADDRESSBOOK_LABEL, '/addressbook/label/3/').calledWith(3, undefined), 'addressbook-user [id]');
				assert(router.testRoute(ADDRESSBOOK_LABEL, '/addressbook/label/5/letter/6/').calledWith(5, 6), 'addressbook-user [id, letter]');

				refute(router.testRoute(CALENDAR, '/calendar/2014/').called, 'calendar [year]');
				refute(router.testRoute(CALENDAR, '/calendar/2014/4/').called, 'calendar [year] [month]');
				assert(router.testRoute(CALENDAR, '/calendar/2014/4/22/').calledWith(2014, 4, 22), 'calendar [year] [month] [day]');
			}
		});
	});
});
