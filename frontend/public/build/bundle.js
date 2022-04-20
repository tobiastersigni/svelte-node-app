
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe$1(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe$1(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }

    function bind$1(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const { set, subscribe } = writable({});

    const remove = () => {
      set({});
    };

    const activeRoute = {
      subscribe,
      set,
      remove,
    };

    const UrlParser = (urlString, namedUrl = '') => {
      const urlBase = new URL(urlString);

      /**
       * Wrapper for URL.hash
       *
       **/
      function hash() {
        return urlBase.hash;
      }

      /**
       * Wrapper for URL.host
       *
       **/
      function host() {
        return urlBase.host;
      }

      /**
       * Wrapper for URL.hostname
       *
       **/
      function hostname() {
        return urlBase.hostname;
      }

      /**
       * Returns an object with all the named params and their values
       *
       **/
      function namedParams() {
        const allPathName = pathNames();
        const allNamedParamsKeys = namedParamsWithIndex();

        return allNamedParamsKeys.reduce((values, paramKey) => {
          values[paramKey.value] = allPathName[paramKey.index];
          return values;
        }, {});
      }

      /**
       * Returns an array with all the named param keys
       *
       **/
      function namedParamsKeys() {
        const allNamedParamsKeys = namedParamsWithIndex();

        return allNamedParamsKeys.reduce((values, paramKey) => {
          values.push(paramKey.value);
          return values;
        }, []);
      }

      /**
       * Returns an array with all the named param values
       *
       **/
      function namedParamsValues() {
        const allPathName = pathNames();
        const allNamedParamsKeys = namedParamsWithIndex();

        return allNamedParamsKeys.reduce((values, paramKey) => {
          values.push(allPathName[paramKey.index]);
          return values;
        }, []);
      }

      /**
       * Returns an array with all named param ids and their position in the path
       * Private
       **/
      function namedParamsWithIndex() {
        const namedUrlParams = getPathNames(namedUrl);

        return namedUrlParams.reduce((validParams, param, index) => {
          if (param[0] === ':') {
            validParams.push({ value: param.slice(1), index });
          }
          return validParams;
        }, []);
      }

      /**
       * Wrapper for URL.port
       *
       **/
      function port() {
        return urlBase.port;
      }

      /**
       * Wrapper for URL.pathname
       *
       **/
      function pathname() {
        return urlBase.pathname;
      }

      /**
       * Wrapper for URL.protocol
       *
       **/
      function protocol() {
        return urlBase.protocol;
      }

      /**
       * Wrapper for URL.search
       *
       **/
      function search() {
        return urlBase.search;
      }

      /**
       * Returns an object with all query params and their values
       *
       **/
      function queryParams() {
        const params = {};
        urlBase.searchParams.forEach((value, key) => {
          params[key] = value;
        });

        return params;
      }

      /**
       * Returns an array with all the query param keys
       *
       **/
      function queryParamsKeys() {
        const params = [];
        urlBase.searchParams.forEach((_value, key) => {
          params.push(key);
        });

        return params;
      }

      /**
       * Returns an array with all the query param values
       *
       **/
      function queryParamsValues() {
        const params = [];
        urlBase.searchParams.forEach((value) => {
          params.push(value);
        });

        return params;
      }

      /**
       * Returns an array with all the elements of a pathname
       *
       **/
      function pathNames() {
        return getPathNames(urlBase.pathname);
      }

      /**
       * Returns an array with all the parts of a pathname
       * Private method
       **/
      function getPathNames(pathName) {
        if (pathName === '/' || pathName.trim().length === 0) return [pathName];
        if (pathName.slice(-1) === '/') {
          pathName = pathName.slice(0, -1);
        }
        if (pathName[0] === '/') {
          pathName = pathName.slice(1);
        }

        return pathName.split('/');
      }

      return Object.freeze({
        hash: hash(),
        host: host(),
        hostname: hostname(),
        namedParams: namedParams(),
        namedParamsKeys: namedParamsKeys(),
        namedParamsValues: namedParamsValues(),
        pathNames: pathNames(),
        port: port(),
        pathname: pathname(),
        protocol: protocol(),
        search: search(),
        queryParams: queryParams(),
        queryParamsKeys: queryParamsKeys(),
        queryParamsValues: queryParamsValues(),
      });
    };

    /**
     * Returns true if object has any nested routes empty
     * @param routeObject
     **/
    const anyEmptyNestedRoutes = (routeObject) => {
      let result = false;
      if (Object.keys(routeObject).length === 0) {
        return true;
      }

      if (routeObject.childRoute && Object.keys(routeObject.childRoute).length === 0) {
        result = true;
      } else if (routeObject.childRoute) {
        result = anyEmptyNestedRoutes(routeObject.childRoute);
      }

      return result;
    };

    /**
     * Compare two routes ignoring named params
     * @param pathName string
     * @param routeName string
     **/

    const compareRoutes = (pathName, routeName) => {
      routeName = removeSlash(routeName);

      if (routeName.includes(':')) {
        return routeName.includes(pathName);
      } else {
        return routeName.startsWith(pathName);
      }
    };

    /**
     * Returns a boolean indicating if the name of path exists in the route based on the language parameter
     * @param pathName string
     * @param route object
     * @param language string
     **/

    const findLocalisedRoute = (pathName, route, language) => {
      let exists = false;

      if (language) {
        return { exists: route.lang && route.lang[language] && route.lang[language].includes(pathName), language };
      }

      exists = compareRoutes(pathName, route.name);

      if (!exists && route.lang && typeof route.lang === 'object') {
        for (const [key, value] of Object.entries(route.lang)) {
          if (compareRoutes(pathName, value)) {
            exists = true;
            language = key;
          }
        }
      }

      return { exists, language };
    };

    /**
     * Return all the consecutive named param (placeholders) of a pathname
     * @param pathname
     **/
    const getNamedParams = (pathName = '') => {
      if (pathName.trim().length === 0) return [];
      const namedUrlParams = getPathNames(pathName);
      return namedUrlParams.reduce((validParams, param) => {
        if (param[0] === ':') {
          validParams.push(param.slice(1));
        }

        return validParams;
      }, []);
    };

    /**
     * Split a pathname based on /
     * @param pathName
     * Private method
     **/
    const getPathNames = (pathName) => {
      if (pathName === '/' || pathName.trim().length === 0) return [pathName];

      pathName = removeSlash(pathName, 'both');

      return pathName.split('/');
    };

    /**
     * Return the first part of a pathname until the first named param is found
     * @param name
     **/
    const nameToPath = (name = '') => {
      let routeName;
      if (name === '/' || name.trim().length === 0) return name;
      name = removeSlash(name, 'lead');
      routeName = name.split(':')[0];
      routeName = removeSlash(routeName, 'trail');

      return routeName.toLowerCase();
    };

    /**
     * Return the path name excluding query params
     * @param name
     **/
    const pathWithoutQueryParams = (currentRoute) => {
      const path = currentRoute.path.split('?');
      return path[0];
    };

    /**
     * Return the path name including query params
     * @param name
     **/
    const pathWithQueryParams = (currentRoute) => {
      let queryParams = [];
      if (currentRoute.queryParams) {
        for (let [key, value] of Object.entries(currentRoute.queryParams)) {
          queryParams.push(`${key}=${value}`);
        }
      }

      const hash = currentRoute.hash ? currentRoute.hash : '';

      if (queryParams.length > 0) {
        return `${currentRoute.path}?${queryParams.join('&')}${hash}`;
      } else {
        return currentRoute.path + hash;
      }
    };

    /**
     * Returns a string with trailing or leading slash character removed
     * @param pathName string
     * @param position string - lead, trail, both
     **/
    const removeExtraPaths = (pathNames, basePathNames) => {
      const names = basePathNames.split('/');
      if (names.length > 1) {
        names.forEach(function (name, index) {
          if (name.length > 0 && index > 0) {
            pathNames.shift();
          }
        });
      }

      return pathNames;
    };

    /**
     * Returns a string with trailing or leading slash character removed
     * @param pathName string
     * @param position string - lead, trail, both
     **/

    const removeSlash = (pathName, position = 'lead') => {
      if (position === 'trail' || position === 'both') {
        pathName = pathName.replace(/\/$/, '');
      }

      if (position === 'lead' || position === 'both') {
        pathName = pathName.replace(/^\//, '');
      }

      return pathName;
    };

    /**
     * Returns the name of the route based on the language parameter
     * @param route object
     * @param language string
     **/

    const routeNameLocalised = (route, language = null) => {
      if (!language || !route.lang || !route.lang[language]) {
        return route.name;
      } else {
        return route.lang[language];
      }
    };

    /**
     * Return the path name excluding query params
     * @param name
     **/
    const startsWithNamedParam = (currentRoute) => {
      const routeName = removeSlash(currentRoute);

      return routeName.startsWith(':');
    };

    /**
     * Updates the base route path.
     * Route objects can have nested routes (childRoutes) or just a long name like "admin/employees/show/:id"
     *
     * @param basePath string
     * @param pathNames array
     * @param route object
     * @param language string
     **/

    const updateRoutePath = (basePath, pathNames, route, language, convert = false) => {
      if (basePath === '/' || basePath.trim().length === 0) return { result: basePath, language: null };

      let basePathResult = basePath;
      let routeName = route.name;
      let currentLanguage = language;

      if (convert) {
        currentLanguage = '';
      }

      routeName = removeSlash(routeName);
      basePathResult = removeSlash(basePathResult);

      if (!route.childRoute) {
        let localisedRoute = findLocalisedRoute(basePathResult, route, currentLanguage);

        if (localisedRoute.exists && convert) {
          basePathResult = routeNameLocalised(route, language);
        }

        let routeNames = routeName.split(':')[0];
        routeNames = removeSlash(routeNames, 'trail');
        routeNames = routeNames.split('/');
        routeNames.shift();
        routeNames.forEach(() => {
          const currentPathName = pathNames[0];
          localisedRoute = findLocalisedRoute(`${basePathResult}/${currentPathName}`, route, currentLanguage);

          if (currentPathName && localisedRoute.exists) {
            if (convert) {
              basePathResult = routeNameLocalised(route, language);
            } else {
              basePathResult = `${basePathResult}/${currentPathName}`;
            }
            pathNames.shift();
          } else {
            return { result: basePathResult, language: localisedRoute.language };
          }
        });
        return { result: basePathResult, language: localisedRoute.language };
      } else {
        return { result: basePath, language: currentLanguage };
      }
    };

    const RouterCurrent = (trackPage) => {
      const trackPageview = trackPage || false;
      let activeRoute = '';

      const setActive = (newRoute, updateBrowserHistory) => {
        activeRoute = newRoute.path;
        pushActiveRoute(newRoute, updateBrowserHistory);
      };

      const active = () => {
        return activeRoute;
      };

      /**
       * Returns true if pathName is current active route
       * @param pathName String The path name to check against the current route.
       * @param includePath Boolean if true checks that pathName is included in current route. If false should match it.
       **/
      const isActive = (queryPath, includePath = false) => {
        if (queryPath[0] !== '/') {
          queryPath = '/' + queryPath;
        }

        // remove query params for comparison
        let pathName = UrlParser(`http://fake.com${queryPath}`).pathname;
        let activeRoutePath = UrlParser(`http://fake.com${activeRoute}`).pathname;

        pathName = removeSlash(pathName, 'trail');

        activeRoutePath = removeSlash(activeRoutePath, 'trail');

        if (includePath) {
          return activeRoutePath.includes(pathName);
        } else {
          return activeRoutePath === pathName;
        }
      };

      const pushActiveRoute = (newRoute, updateBrowserHistory) => {
        if (typeof window !== 'undefined') {
          const pathAndSearch = pathWithQueryParams(newRoute);

          if (updateBrowserHistory) {
            window.history.pushState({ page: pathAndSearch }, '', pathAndSearch);
          }
          // Moving back in history does not update browser history but does update tracking.
          if (trackPageview) {
            gaTracking(pathAndSearch);
          }
        }
      };

      const gaTracking = (newPage) => {
        if (typeof ga !== 'undefined') {
          ga('set', 'page', newPage);
          ga('send', 'pageview');
        }
      };

      return Object.freeze({ active, isActive, setActive });
    };

    const RouterGuard = (onlyIf) => {
      const guardInfo = onlyIf;

      const valid = () => {
        return guardInfo && guardInfo.guard && typeof guardInfo.guard === 'function';
      };

      const redirect = () => {
        return !guardInfo.guard();
      };

      const redirectPath = () => {
        let destinationUrl = '/';
        if (guardInfo.redirect && guardInfo.redirect.length > 0) {
          destinationUrl = guardInfo.redirect;
        }

        return destinationUrl;
      };

      return Object.freeze({ valid, redirect, redirectPath });
    };

    const RouterRedirect = (route, currentPath) => {
      const guard = RouterGuard(route.onlyIf);

      const path = () => {
        let redirectTo = currentPath;
        if (route.redirectTo && route.redirectTo.length > 0) {
          redirectTo = route.redirectTo;
        }

        if (guard.valid() && guard.redirect()) {
          redirectTo = guard.redirectPath();
        }

        return redirectTo;
      };

      return Object.freeze({ path });
    };

    function RouterRoute({ routeInfo, path, routeNamedParams, urlParser, namedPath, language }) {
      const namedParams = () => {
        const parsedParams = UrlParser(`https://fake.com${urlParser.pathname}`, namedPath).namedParams;

        return { ...routeNamedParams, ...parsedParams };
      };

      const get = () => {
        return {
          name: path,
          component: routeInfo.component,
          hash: urlParser.hash,
          layout: routeInfo.layout,
          queryParams: urlParser.queryParams,
          namedParams: namedParams(),
          path,
          language,
        };
      };

      return Object.freeze({ get, namedParams });
    }

    function RouterPath({ basePath, basePathName, pathNames, convert, currentLanguage }) {
      let updatedPathRoute;
      let route;
      let routePathLanguage = currentLanguage;

      function updatedPath(currentRoute) {
        route = currentRoute;
        updatedPathRoute = updateRoutePath(basePathName, pathNames, route, routePathLanguage, convert);
        routePathLanguage = convert ? currentLanguage : updatedPathRoute.language;

        return updatedPathRoute;
      }

      function localisedPathName() {
        return routeNameLocalised(route, routePathLanguage);
      }

      function localisedRouteWithoutNamedParams() {
        return nameToPath(localisedPathName());
      }

      function basePathNameWithoutNamedParams() {
        return nameToPath(updatedPathRoute.result);
      }

      function namedPath() {
        let localisedPath = localisedPathName();
        if (localisedPath && !localisedPath.startsWith('/')) {
          localisedPath = '/' + localisedPath;
        }

        return basePath ? `${basePath}${localisedPath}` : localisedPath;
      }

      function routePath() {
        let routePathValue = `${basePath}/${basePathNameWithoutNamedParams()}`;
        if (routePathValue === '//') {
          routePathValue = '/';
        }

        if (routePathLanguage) {
          pathNames = removeExtraPaths(pathNames, localisedRouteWithoutNamedParams());
        }

        const namedParams = getNamedParams(localisedPathName());
        if (namedParams && namedParams.length > 0) {
          namedParams.forEach(function () {
            if (pathNames.length > 0) {
              routePathValue += `/${pathNames.shift()}`;
            }
          });
        }

        return routePathValue;
      }

      function routeLanguage() {
        return routePathLanguage;
      }

      function basePathSameAsLocalised() {
        return basePathNameWithoutNamedParams() === localisedRouteWithoutNamedParams();
      }

      return Object.freeze({
        basePathSameAsLocalised,
        updatedPath,
        basePathNameWithoutNamedParams,
        localisedPathName,
        localisedRouteWithoutNamedParams,
        namedPath,
        pathNames,
        routeLanguage,
        routePath,
      });
    }

    const NotFoundPage$1 = '/404.html';

    function RouterFinder({ routes, currentUrl, routerOptions, convert }) {
      const defaultLanguage = routerOptions.defaultLanguage;
      const sitePrefix = routerOptions.prefix ? routerOptions.prefix.toLowerCase() : '';
      const urlParser = parseCurrentUrl(currentUrl, sitePrefix);
      let redirectTo = '';
      let routeNamedParams = {};
      let staticParamMatch = false;

      function findActiveRoute() {
        let searchActiveRoute = searchActiveRoutes(routes, '', urlParser.pathNames, routerOptions.lang, convert);

        if (!searchActiveRoute || !Object.keys(searchActiveRoute).length || anyEmptyNestedRoutes(searchActiveRoute)) {
          if (typeof window !== 'undefined') {
            searchActiveRoute = routeNotFound(routerOptions.lang);
          }
        } else {
          searchActiveRoute.path = pathWithoutQueryParams(searchActiveRoute);
          if (sitePrefix) {
            searchActiveRoute.path = `/${sitePrefix}${searchActiveRoute.path}`;
          }
        }

        return searchActiveRoute;
      }

      /**
       * Gets an array of routes and the browser pathname and return the active route
       * @param routes
       * @param basePath
       * @param pathNames
       **/
      function searchActiveRoutes(routes, basePath, pathNames, currentLanguage, convert) {
        let currentRoute = {};
        let basePathName = pathNames.shift().toLowerCase();
        const routerPath = RouterPath({ basePath, basePathName, pathNames, convert, currentLanguage });
        staticParamMatch = false;

        routes.forEach(function (route) {
          routerPath.updatedPath(route);

          if (matchRoute(routerPath, route.name)) {
            let routePath = routerPath.routePath();
            redirectTo = RouterRedirect(route, redirectTo).path();

            if (currentRoute.name !== routePath) {
              currentRoute = setCurrentRoute({
                route,
                routePath,
                routeLanguage: routerPath.routeLanguage(),
                urlParser,
                namedPath: routerPath.namedPath(),
              });
            }

            if (route.nestedRoutes && route.nestedRoutes.length > 0 && routerPath.pathNames.length > 0) {
              currentRoute.childRoute = searchActiveRoutes(
                route.nestedRoutes,
                routePath,
                routerPath.pathNames,
                routerPath.routeLanguage(),
                convert
              );
              currentRoute.path = currentRoute.childRoute.path;
              currentRoute.language = currentRoute.childRoute.language;
            } else if (nestedRoutesAndNoPath(route, routerPath.pathNames)) {
              const indexRoute = searchActiveRoutes(
                route.nestedRoutes,
                routePath,
                ['index'],
                routerPath.routeLanguage(),
                convert
              );
              if (indexRoute && Object.keys(indexRoute).length > 0) {
                currentRoute.childRoute = indexRoute;
                currentRoute.language = currentRoute.childRoute.language;
              }
            }
          }
        });

        if (redirectTo) {
          currentRoute.redirectTo = redirectTo;
        }

        return currentRoute;
      }

      function matchRoute(routerPath, routeName) {
        const basePathSameAsLocalised = routerPath.basePathSameAsLocalised();
        if (basePathSameAsLocalised) {
          staticParamMatch = true;
        }

        return basePathSameAsLocalised || (!staticParamMatch && startsWithNamedParam(routeName));
      }

      function nestedRoutesAndNoPath(route, pathNames) {
        return route.nestedRoutes && route.nestedRoutes.length > 0 && pathNames.length === 0;
      }

      function parseCurrentUrl(currentUrl, sitePrefix) {
        if (sitePrefix && sitePrefix.trim().length > 0) {
          const replacePattern = currentUrl.endsWith(sitePrefix) ? sitePrefix : sitePrefix + "/";
          const noPrefixUrl = currentUrl.replace(replacePattern, '');
          return UrlParser(noPrefixUrl);
        } else {
          return UrlParser(currentUrl);
        }
      }

      function setCurrentRoute({ route, routePath, routeLanguage, urlParser, namedPath }) {
        const routerRoute = RouterRoute({
          routeInfo: route,
          urlParser,
          path: routePath,
          routeNamedParams,
          namedPath,
          language: routeLanguage || defaultLanguage,
        });
        routeNamedParams = routerRoute.namedParams();

        return routerRoute.get();
      }

      const routeNotFound = (customLanguage) => {
        const custom404Page = routes.find((route) => route.name == '404');
        const language = customLanguage || defaultLanguage || '';
        if (custom404Page) {
          return { ...custom404Page, language, path: '404' };
        } else {
          return { name: '404', component: '', path: '404', redirectTo: NotFoundPage$1 };
        }
      };

      return Object.freeze({ findActiveRoute });
    }

    const NotFoundPage = '/404.html';

    let userDefinedRoutes = [];
    let routerOptions = {};
    let routerCurrent;

    /**
     * Object exposes one single property: activeRoute
     * @param routes  Array of routes
     * @param currentUrl current url
     * @param options configuration options
     **/
    const SpaRouter = (routes, currentUrl, options = {}) => {
      routerOptions = { ...options };
      if (typeof currentUrl === 'undefined' || currentUrl === '') {
        currentUrl = document.location.href;
      }

      routerCurrent = RouterCurrent(routerOptions.gaPageviews);

      currentUrl = removeSlash(currentUrl, 'trail');
      userDefinedRoutes = routes;

      const findActiveRoute = () => {
        let convert = false;

        if (routerOptions.langConvertTo) {
          routerOptions.lang = routerOptions.langConvertTo;
          convert = true;
        }

        return RouterFinder({ routes, currentUrl, routerOptions, convert }).findActiveRoute();
      };

      /**
       * Redirect current route to another
       * @param destinationUrl
       **/
      const navigateNow = (destinationUrl, updateBrowserHistory) => {
        if (typeof window !== 'undefined') {
          if (destinationUrl === NotFoundPage) {
            routerCurrent.setActive({ path: NotFoundPage }, updateBrowserHistory);
          } else {
            navigateTo(destinationUrl);
          }
        }

        return destinationUrl;
      };

      const setActiveRoute = (updateBrowserHistory = true) => {
        const currentRoute = findActiveRoute();
        if (currentRoute.redirectTo) {
          return navigateNow(currentRoute.redirectTo, updateBrowserHistory);
        }

        routerCurrent.setActive(currentRoute, updateBrowserHistory);
        activeRoute.set(currentRoute);

        return currentRoute;
      };

      return Object.freeze({
        setActiveRoute,
        findActiveRoute,
      });
    };

    /**
     * Converts a route to its localised version
     * @param pathName
     **/
    const localisedRoute = (pathName, language) => {
      pathName = removeSlash(pathName, 'lead');
      routerOptions.langConvertTo = language;

      return SpaRouter(userDefinedRoutes, 'http://fake.com/' + pathName, routerOptions).findActiveRoute();
    };

    /**
     * Updates the current active route and updates the browser pathname
     * @param pathName String
     * @param language String
     * @param updateBrowserHistory Boolean
     **/
    const navigateTo = (pathName, language = null, updateBrowserHistory = true) => {
      pathName = removeSlash(pathName, 'lead');

      if (language) {
        routerOptions.langConvertTo = language;
      }

      return SpaRouter(userDefinedRoutes, 'http://fake.com/' + pathName, routerOptions).setActiveRoute(
        updateBrowserHistory
      );
    };

    /**
     * Returns true if pathName is current active route
     * @param pathName String The path name to check against the current route.
     * @param includePath Boolean if true checks that pathName is included in current route. If false should match it.
     **/
    const routeIsActive = (queryPath, includePath = false) => {
      return routerCurrent.isActive(queryPath, includePath);
    };

    if (typeof window !== 'undefined') {
      // Avoid full page reload on local routes
      window.addEventListener('click', (event) => {
        if (event.target.localName.toLowerCase() !== 'a') return;
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;

        const sitePrefix = routerOptions.prefix ? `/${routerOptions.prefix.toLowerCase()}` : '';
        const targetHostNameInternal = event.target.pathname && event.target.host === window.location.host;
        const prefixMatchPath = sitePrefix.length > 1 ? event.target.pathname.startsWith(sitePrefix) : true;

        if (targetHostNameInternal && prefixMatchPath) {
          event.preventDefault();
          let navigatePathname = event.target.pathname + event.target.search;

          const destinationUrl = navigatePathname + event.target.search + event.target.hash;
          if (event.target.target === '_blank') {
            window.open(destinationUrl, 'newTab');
          } else {
            navigateTo(destinationUrl);
          }
        }
      });

      window.onpopstate = function (_event) {
        let navigatePathname = window.location.pathname + window.location.search + window.location.hash;

        navigateTo(navigatePathname, null, false);
      };
    }

    /* node_modules/svelte-router-spa/src/components/route.svelte generated by Svelte v3.46.4 */

    // (10:34) 
    function create_if_block_2$1(ctx) {
    	let route;
    	let current;

    	route = new Route({
    			props: {
    				currentRoute: /*currentRoute*/ ctx[0].childRoute,
    				params: /*params*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route_changes = {};
    			if (dirty & /*currentRoute*/ 1) route_changes.currentRoute = /*currentRoute*/ ctx[0].childRoute;
    			if (dirty & /*params*/ 2) route_changes.params = /*params*/ ctx[1];
    			route.$set(route_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(10:34) ",
    		ctx
    	});

    	return block;
    }

    // (8:33) 
    function create_if_block_1$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*currentRoute*/ ctx[0].component;

    	function switch_props(ctx) {
    		return {
    			props: {
    				currentRoute: {
    					.../*currentRoute*/ ctx[0],
    					component: ''
    				},
    				params: /*params*/ ctx[1]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};

    			if (dirty & /*currentRoute*/ 1) switch_instance_changes.currentRoute = {
    				.../*currentRoute*/ ctx[0],
    				component: ''
    			};

    			if (dirty & /*params*/ 2) switch_instance_changes.params = /*params*/ ctx[1];

    			if (switch_value !== (switch_value = /*currentRoute*/ ctx[0].component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(8:33) ",
    		ctx
    	});

    	return block;
    }

    // (6:0) {#if currentRoute.layout}
    function create_if_block$4(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*currentRoute*/ ctx[0].layout;

    	function switch_props(ctx) {
    		return {
    			props: {
    				currentRoute: { .../*currentRoute*/ ctx[0], layout: '' },
    				params: /*params*/ ctx[1]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*currentRoute*/ 1) switch_instance_changes.currentRoute = { .../*currentRoute*/ ctx[0], layout: '' };
    			if (dirty & /*params*/ 2) switch_instance_changes.params = /*params*/ ctx[1];

    			if (switch_value !== (switch_value = /*currentRoute*/ ctx[0].layout)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(6:0) {#if currentRoute.layout}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_if_block_1$1, create_if_block_2$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*currentRoute*/ ctx[0].layout) return 0;
    		if (/*currentRoute*/ ctx[0].component) return 1;
    		if (/*currentRoute*/ ctx[0].childRoute) return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Route', slots, []);
    	let { currentRoute = {} } = $$props;
    	let { params = {} } = $$props;
    	const writable_props = ['currentRoute', 'params'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Route> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('currentRoute' in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    		if ('params' in $$props) $$invalidate(1, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({ currentRoute, params });

    	$$self.$inject_state = $$props => {
    		if ('currentRoute' in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    		if ('params' in $$props) $$invalidate(1, params = $$props.params);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentRoute, params];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { currentRoute: 0, params: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$e.name
    		});
    	}

    	get currentRoute() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentRoute(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get params() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-router-spa/src/components/router.svelte generated by Svelte v3.46.4 */

    function create_fragment$d(ctx) {
    	let route;
    	let current;

    	route = new Route({
    			props: { currentRoute: /*$activeRoute*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const route_changes = {};
    			if (dirty & /*$activeRoute*/ 1) route_changes.currentRoute = /*$activeRoute*/ ctx[0];
    			route.$set(route_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	validate_store(activeRoute, 'activeRoute');
    	component_subscribe($$self, activeRoute, $$value => $$invalidate(0, $activeRoute = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = [] } = $$props;
    	let { options = {} } = $$props;

    	onMount(() => {
    		SpaRouter(routes, document.location.href, options).setActiveRoute();
    	});

    	const writable_props = ['routes', 'options'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(1, routes = $$props.routes);
    		if ('options' in $$props) $$invalidate(2, options = $$props.options);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		SpaRouter,
    		Route,
    		activeRoute,
    		routes,
    		options,
    		$activeRoute
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(1, routes = $$props.routes);
    		if ('options' in $$props) $$invalidate(2, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$activeRoute, routes, options];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { routes: 1, options: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get routes() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-router-spa/src/components/navigate.svelte generated by Svelte v3.46.4 */
    const file$b = "node_modules/svelte-router-spa/src/components/navigate.svelte";

    function create_fragment$c(ctx) {
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr_dev(a, "href", /*to*/ ctx[0]);
    			attr_dev(a, "title", /*title*/ ctx[1]);
    			attr_dev(a, "class", /*styles*/ ctx[2]);
    			toggle_class(a, "active", routeIsActive(/*to*/ ctx[0]));
    			add_location(a, file$b, 26, 0, 560);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*navigate*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*to*/ 1) {
    				attr_dev(a, "href", /*to*/ ctx[0]);
    			}

    			if (!current || dirty & /*title*/ 2) {
    				attr_dev(a, "title", /*title*/ ctx[1]);
    			}

    			if (!current || dirty & /*styles*/ 4) {
    				attr_dev(a, "class", /*styles*/ ctx[2]);
    			}

    			if (dirty & /*styles, routeIsActive, to*/ 5) {
    				toggle_class(a, "active", routeIsActive(/*to*/ ctx[0]));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navigate', slots, ['default']);
    	let { to = '/' } = $$props;
    	let { title = '' } = $$props;
    	let { styles = '' } = $$props;
    	let { lang = null } = $$props;

    	onMount(() => {
    		if (lang) {
    			const route = localisedRoute(to, lang);

    			if (route) {
    				$$invalidate(0, to = route.path);
    			}
    		}
    	});

    	const navigate = event => {
    		if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    		event.preventDefault();
    		event.stopPropagation();
    		navigateTo(to);
    	};

    	const writable_props = ['to', 'title', 'styles', 'lang'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Navigate> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('to' in $$props) $$invalidate(0, to = $$props.to);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('styles' in $$props) $$invalidate(2, styles = $$props.styles);
    		if ('lang' in $$props) $$invalidate(4, lang = $$props.lang);
    		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		localisedRoute,
    		navigateTo,
    		routeIsActive,
    		to,
    		title,
    		styles,
    		lang,
    		navigate
    	});

    	$$self.$inject_state = $$props => {
    		if ('to' in $$props) $$invalidate(0, to = $$props.to);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('styles' in $$props) $$invalidate(2, styles = $$props.styles);
    		if ('lang' in $$props) $$invalidate(4, lang = $$props.lang);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [to, title, styles, navigate, lang, $$scope, slots];
    }

    class Navigate extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { to: 0, title: 1, styles: 2, lang: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navigate",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get to() {
    		throw new Error("<Navigate>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Navigate>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Navigate>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Navigate>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styles() {
    		throw new Error("<Navigate>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styles(value) {
    		throw new Error("<Navigate>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lang() {
    		throw new Error("<Navigate>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lang(value) {
    		throw new Error("<Navigate>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/views/public/Home.svelte generated by Svelte v3.46.4 */
    const file$a = "src/views/public/Home.svelte";

    // (71:12) <Navigate to="/admin/manage-menus">
    function create_default_slot$1(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Log in";
    			attr_dev(button, "class", "button is-small is-text");
    			add_location(button, file$a, 71, 16, 2543);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(71:12) <Navigate to=\\\"/admin/manage-menus\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div11;
    	let div10;
    	let div1;
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t5;
    	let div9;
    	let div8;
    	let h3;
    	let t7;
    	let div3;
    	let label0;
    	let t9;
    	let div2;
    	let input0;
    	let t10;
    	let div5;
    	let label1;
    	let t12;
    	let div4;
    	let input1;
    	let t13;
    	let div7;
    	let div6;
    	let button;
    	let t15;
    	let div13;
    	let div12;
    	let center;
    	let span;
    	let t17;
    	let navigate;
    	let current;
    	let mounted;
    	let dispose;

    	navigate = new Navigate({
    			props: {
    				to: "/admin/manage-menus",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div10 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Easily Publish Your School Lunch Menus";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "We make it easy to publish weekly school lunch menus on the\n                    web and provide them to students and parents in a mobile\n                    friendly format.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Just set the details and hit publish! Register and get\n                    started today.";
    			t5 = space();
    			div9 = element("div");
    			div8 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Register Now";
    			t7 = space();
    			div3 = element("div");
    			label0 = element("label");
    			label0.textContent = "Email Address";
    			t9 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t10 = space();
    			div5 = element("div");
    			label1 = element("label");
    			label1.textContent = "School Name";
    			t12 = space();
    			div4 = element("div");
    			input1 = element("input");
    			t13 = space();
    			div7 = element("div");
    			div6 = element("div");
    			button = element("button");
    			button.textContent = "Go";
    			t15 = space();
    			div13 = element("div");
    			div12 = element("div");
    			center = element("center");
    			span = element("span");
    			span.textContent = "Already registered?";
    			t17 = space();
    			create_component(navigate.$$.fragment);
    			add_location(h1, file$a, 14, 16, 353);
    			add_location(p0, file$a, 15, 16, 417);
    			add_location(p1, file$a, 20, 16, 652);
    			attr_dev(div0, "class", "content");
    			add_location(div0, file$a, 13, 12, 315);
    			attr_dev(div1, "class", "column");
    			add_location(div1, file$a, 12, 8, 282);
    			add_location(h3, file$a, 28, 16, 900);
    			attr_dev(label0, "class", "label");
    			attr_dev(label0, "for", "emailAddress");
    			add_location(label0, file$a, 30, 20, 978);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "emailAddress");
    			attr_dev(input0, "placeholder", "Enter your email address");
    			attr_dev(input0, "class", "input");
    			add_location(input0, file$a, 33, 24, 1127);
    			attr_dev(div2, "class", "control");
    			add_location(div2, file$a, 32, 20, 1081);
    			attr_dev(div3, "class", "field");
    			add_location(div3, file$a, 29, 16, 938);
    			attr_dev(label1, "class", "label");
    			attr_dev(label1, "for", "schoolName");
    			add_location(label1, file$a, 43, 20, 1516);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "id", "schoolName");
    			attr_dev(input1, "placeholder", "Enter your school's name");
    			attr_dev(input1, "class", "input");
    			add_location(input1, file$a, 45, 24, 1640);
    			attr_dev(div4, "class", "control");
    			add_location(div4, file$a, 44, 20, 1594);
    			attr_dev(div5, "class", "field");
    			add_location(div5, file$a, 42, 16, 1476);
    			attr_dev(button, "class", "button is-link is-outlined");
    			add_location(button, file$a, 56, 24, 2082);
    			attr_dev(div6, "class", "control");
    			add_location(div6, file$a, 55, 20, 2036);
    			attr_dev(div7, "class", "field is-grouped");
    			add_location(div7, file$a, 54, 16, 1985);
    			attr_dev(div8, "class", "content");
    			add_location(div8, file$a, 27, 12, 862);
    			attr_dev(div9, "class", "column");
    			add_location(div9, file$a, 26, 8, 829);
    			attr_dev(div10, "class", "columns");
    			add_location(div10, file$a, 11, 4, 252);
    			attr_dev(div11, "class", "notification");
    			add_location(div11, file$a, 10, 0, 221);
    			add_location(span, file$a, 69, 12, 2446);
    			add_location(center, file$a, 68, 8, 2425);
    			attr_dev(div12, "class", "content");
    			set_style(div12, "line-height", "30px");
    			add_location(div12, file$a, 67, 4, 2368);
    			attr_dev(div13, "class", "container");
    			add_location(div13, file$a, 66, 0, 2340);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div10);
    			append_dev(div10, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div0, t3);
    			append_dev(div0, p1);
    			append_dev(div10, t5);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, h3);
    			append_dev(div8, t7);
    			append_dev(div8, div3);
    			append_dev(div3, label0);
    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div2, input0);
    			set_input_value(input0, /*emailAddress*/ ctx[0]);
    			append_dev(div8, t10);
    			append_dev(div8, div5);
    			append_dev(div5, label1);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, input1);
    			set_input_value(input1, /*schoolName*/ ctx[1]);
    			append_dev(div8, t13);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, button);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div12);
    			append_dev(div12, center);
    			append_dev(center, span);
    			append_dev(center, t17);
    			mount_component(navigate, center, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[4]),
    					listen_dev(button, "click", /*register*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*emailAddress*/ 1 && input0.value !== /*emailAddress*/ ctx[0]) {
    				set_input_value(input0, /*emailAddress*/ ctx[0]);
    			}

    			if (dirty & /*schoolName*/ 2 && input1.value !== /*schoolName*/ ctx[1]) {
    				set_input_value(input1, /*schoolName*/ ctx[1]);
    			}

    			const navigate_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				navigate_changes.$$scope = { dirty, ctx };
    			}

    			navigate.$set(navigate_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navigate.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navigate.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(div13);
    			destroy_component(navigate);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	let emailAddress;
    	let schoolName;

    	function register() {
    		alert(`Email is ${emailAddress} and School Name is ${schoolName}`);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		emailAddress = this.value;
    		$$invalidate(0, emailAddress);
    	}

    	function input1_input_handler() {
    		schoolName = this.value;
    		$$invalidate(1, schoolName);
    	}

    	$$self.$capture_state = () => ({
    		Navigate,
    		emailAddress,
    		schoolName,
    		register
    	});

    	$$self.$inject_state = $$props => {
    		if ('emailAddress' in $$props) $$invalidate(0, emailAddress = $$props.emailAddress);
    		if ('schoolName' in $$props) $$invalidate(1, schoolName = $$props.schoolName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [emailAddress, schoolName, register, input0_input_handler, input1_input_handler];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/views/public/LunchMenuView.svelte generated by Svelte v3.46.4 */

    const file$9 = "src/views/public/LunchMenuView.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let h1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Lunch Menu View";
    			attr_dev(h1, "class", "title");
    			add_location(h1, file$9, 1, 4, 10);
    			add_location(div, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LunchMenuView', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LunchMenuView> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class LunchMenuView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LunchMenuView",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const user = writable();

    /* node_modules/svelte-awesome/components/svg/Path.svelte generated by Svelte v3.46.4 */

    const file$8 = "node_modules/svelte-awesome/components/svg/Path.svelte";

    function create_fragment$9(ctx) {
    	let path;
    	let path_id_value;

    	let path_levels = [
    		{
    			id: path_id_value = "path-" + /*id*/ ctx[0]
    		},
    		/*data*/ ctx[1]
    	];

    	let path_data = {};

    	for (let i = 0; i < path_levels.length; i += 1) {
    		path_data = assign(path_data, path_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			set_svg_attributes(path, path_data);
    			add_location(path, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(path, path_data = get_spread_update(path_levels, [
    				dirty & /*id*/ 1 && path_id_value !== (path_id_value = "path-" + /*id*/ ctx[0]) && { id: path_id_value },
    				dirty & /*data*/ 2 && /*data*/ ctx[1]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Path', slots, []);
    	let { id } = $$props;
    	let { data = {} } = $$props;
    	const writable_props = ['id', 'data'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Path> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('id' in $$props) $$invalidate(0, id = $$props.id);
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ id, data });

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate(0, id = $$props.id);
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, data];
    }

    class Path extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Path",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[0] === undefined && !('id' in props)) {
    			console.warn("<Path> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Polygon.svelte generated by Svelte v3.46.4 */

    const file$7 = "node_modules/svelte-awesome/components/svg/Polygon.svelte";

    function create_fragment$8(ctx) {
    	let polygon;
    	let polygon_id_value;

    	let polygon_levels = [
    		{
    			id: polygon_id_value = "polygon-" + /*id*/ ctx[0]
    		},
    		/*data*/ ctx[1]
    	];

    	let polygon_data = {};

    	for (let i = 0; i < polygon_levels.length; i += 1) {
    		polygon_data = assign(polygon_data, polygon_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			polygon = svg_element("polygon");
    			set_svg_attributes(polygon, polygon_data);
    			add_location(polygon, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polygon, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(polygon, polygon_data = get_spread_update(polygon_levels, [
    				dirty & /*id*/ 1 && polygon_id_value !== (polygon_id_value = "polygon-" + /*id*/ ctx[0]) && { id: polygon_id_value },
    				dirty & /*data*/ 2 && /*data*/ ctx[1]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(polygon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Polygon', slots, []);
    	let { id } = $$props;
    	let { data = {} } = $$props;
    	const writable_props = ['id', 'data'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Polygon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('id' in $$props) $$invalidate(0, id = $$props.id);
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ id, data });

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate(0, id = $$props.id);
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, data];
    }

    class Polygon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Polygon",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[0] === undefined && !('id' in props)) {
    			console.warn("<Polygon> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Raw.svelte generated by Svelte v3.46.4 */

    const file$6 = "node_modules/svelte-awesome/components/svg/Raw.svelte";

    function create_fragment$7(ctx) {
    	let g;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			add_location(g, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			g.innerHTML = /*raw*/ ctx[0];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*raw*/ 1) g.innerHTML = /*raw*/ ctx[0];		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Raw', slots, []);
    	let cursor = 0xd4937;

    	function getId() {
    		cursor += 1;
    		return `fa-${cursor.toString(16)}`;
    	}

    	let raw;
    	let { data } = $$props;

    	function getRaw(data) {
    		if (!data || !data.raw) {
    			return null;
    		}

    		let rawData = data.raw;
    		const ids = {};

    		rawData = rawData.replace(/\s(?:xml:)?id=["']?([^"')\s]+)/g, (match, id) => {
    			const uniqueId = getId();
    			ids[id] = uniqueId;
    			return ` id="${uniqueId}"`;
    		});

    		rawData = rawData.replace(/#(?:([^'")\s]+)|xpointer\(id\((['"]?)([^')]+)\2\)\))/g, (match, rawId, _, pointerId) => {
    			const id = rawId || pointerId;

    			if (!id || !ids[id]) {
    				return match;
    			}

    			return `#${ids[id]}`;
    		});

    		return rawData;
    	}

    	const writable_props = ['data'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Raw> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ cursor, getId, raw, data, getRaw });

    	$$self.$inject_state = $$props => {
    		if ('cursor' in $$props) cursor = $$props.cursor;
    		if ('raw' in $$props) $$invalidate(0, raw = $$props.raw);
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data*/ 2) {
    			$$invalidate(0, raw = getRaw(data));
    		}
    	};

    	return [raw, data];
    }

    class Raw extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Raw",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[1] === undefined && !('data' in props)) {
    			console.warn("<Raw> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<Raw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Raw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Svg.svelte generated by Svelte v3.46.4 */

    const file$5 = "node_modules/svelte-awesome/components/svg/Svg.svelte";

    function create_fragment$6(ctx) {
    	let svg;
    	let svg_class_value;
    	let svg_role_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			if (default_slot) default_slot.c();
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "class", svg_class_value = "fa-icon " + /*className*/ ctx[0] + " svelte-1dof0an");
    			attr_dev(svg, "x", /*x*/ ctx[8]);
    			attr_dev(svg, "y", /*y*/ ctx[9]);
    			attr_dev(svg, "width", /*width*/ ctx[1]);
    			attr_dev(svg, "height", /*height*/ ctx[2]);
    			attr_dev(svg, "aria-label", /*label*/ ctx[11]);
    			attr_dev(svg, "role", svg_role_value = /*label*/ ctx[11] ? 'img' : 'presentation');
    			attr_dev(svg, "viewBox", /*box*/ ctx[3]);
    			attr_dev(svg, "style", /*style*/ ctx[10]);
    			toggle_class(svg, "fa-spin", /*spin*/ ctx[4]);
    			toggle_class(svg, "fa-pulse", /*pulse*/ ctx[6]);
    			toggle_class(svg, "fa-inverse", /*inverse*/ ctx[5]);
    			toggle_class(svg, "fa-flip-horizontal", /*flip*/ ctx[7] === 'horizontal');
    			toggle_class(svg, "fa-flip-vertical", /*flip*/ ctx[7] === 'vertical');
    			add_location(svg, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			if (default_slot) {
    				default_slot.m(svg, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4096)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[12],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[12])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[12], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*className*/ 1 && svg_class_value !== (svg_class_value = "fa-icon " + /*className*/ ctx[0] + " svelte-1dof0an")) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (!current || dirty & /*x*/ 256) {
    				attr_dev(svg, "x", /*x*/ ctx[8]);
    			}

    			if (!current || dirty & /*y*/ 512) {
    				attr_dev(svg, "y", /*y*/ ctx[9]);
    			}

    			if (!current || dirty & /*width*/ 2) {
    				attr_dev(svg, "width", /*width*/ ctx[1]);
    			}

    			if (!current || dirty & /*height*/ 4) {
    				attr_dev(svg, "height", /*height*/ ctx[2]);
    			}

    			if (!current || dirty & /*label*/ 2048) {
    				attr_dev(svg, "aria-label", /*label*/ ctx[11]);
    			}

    			if (!current || dirty & /*label*/ 2048 && svg_role_value !== (svg_role_value = /*label*/ ctx[11] ? 'img' : 'presentation')) {
    				attr_dev(svg, "role", svg_role_value);
    			}

    			if (!current || dirty & /*box*/ 8) {
    				attr_dev(svg, "viewBox", /*box*/ ctx[3]);
    			}

    			if (!current || dirty & /*style*/ 1024) {
    				attr_dev(svg, "style", /*style*/ ctx[10]);
    			}

    			if (dirty & /*className, spin*/ 17) {
    				toggle_class(svg, "fa-spin", /*spin*/ ctx[4]);
    			}

    			if (dirty & /*className, pulse*/ 65) {
    				toggle_class(svg, "fa-pulse", /*pulse*/ ctx[6]);
    			}

    			if (dirty & /*className, inverse*/ 33) {
    				toggle_class(svg, "fa-inverse", /*inverse*/ ctx[5]);
    			}

    			if (dirty & /*className, flip*/ 129) {
    				toggle_class(svg, "fa-flip-horizontal", /*flip*/ ctx[7] === 'horizontal');
    			}

    			if (dirty & /*className, flip*/ 129) {
    				toggle_class(svg, "fa-flip-vertical", /*flip*/ ctx[7] === 'vertical');
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Svg', slots, ['default']);
    	let { class: className } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;
    	let { box } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { x = undefined } = $$props;
    	let { y = undefined } = $$props;
    	let { style = undefined } = $$props;
    	let { label = undefined } = $$props;

    	const writable_props = [
    		'class',
    		'width',
    		'height',
    		'box',
    		'spin',
    		'inverse',
    		'pulse',
    		'flip',
    		'x',
    		'y',
    		'style',
    		'label'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Svg> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, className = $$props.class);
    		if ('width' in $$props) $$invalidate(1, width = $$props.width);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('box' in $$props) $$invalidate(3, box = $$props.box);
    		if ('spin' in $$props) $$invalidate(4, spin = $$props.spin);
    		if ('inverse' in $$props) $$invalidate(5, inverse = $$props.inverse);
    		if ('pulse' in $$props) $$invalidate(6, pulse = $$props.pulse);
    		if ('flip' in $$props) $$invalidate(7, flip = $$props.flip);
    		if ('x' in $$props) $$invalidate(8, x = $$props.x);
    		if ('y' in $$props) $$invalidate(9, y = $$props.y);
    		if ('style' in $$props) $$invalidate(10, style = $$props.style);
    		if ('label' in $$props) $$invalidate(11, label = $$props.label);
    		if ('$$scope' in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label
    	});

    	$$self.$inject_state = $$props => {
    		if ('className' in $$props) $$invalidate(0, className = $$props.className);
    		if ('width' in $$props) $$invalidate(1, width = $$props.width);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('box' in $$props) $$invalidate(3, box = $$props.box);
    		if ('spin' in $$props) $$invalidate(4, spin = $$props.spin);
    		if ('inverse' in $$props) $$invalidate(5, inverse = $$props.inverse);
    		if ('pulse' in $$props) $$invalidate(6, pulse = $$props.pulse);
    		if ('flip' in $$props) $$invalidate(7, flip = $$props.flip);
    		if ('x' in $$props) $$invalidate(8, x = $$props.x);
    		if ('y' in $$props) $$invalidate(9, y = $$props.y);
    		if ('style' in $$props) $$invalidate(10, style = $$props.style);
    		if ('label' in $$props) $$invalidate(11, label = $$props.label);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label,
    		$$scope,
    		slots
    	];
    }

    class Svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			class: 0,
    			width: 1,
    			height: 2,
    			box: 3,
    			spin: 4,
    			inverse: 5,
    			pulse: 6,
    			flip: 7,
    			x: 8,
    			y: 9,
    			style: 10,
    			label: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Svg",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*className*/ ctx[0] === undefined && !('class' in props)) {
    			console.warn("<Svg> was created without expected prop 'class'");
    		}

    		if (/*width*/ ctx[1] === undefined && !('width' in props)) {
    			console.warn("<Svg> was created without expected prop 'width'");
    		}

    		if (/*height*/ ctx[2] === undefined && !('height' in props)) {
    			console.warn("<Svg> was created without expected prop 'height'");
    		}

    		if (/*box*/ ctx[3] === undefined && !('box' in props)) {
    			console.warn("<Svg> was created without expected prop 'box'");
    		}
    	}

    	get class() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get box() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set box(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/Icon.svelte generated by Svelte v3.46.4 */

    const { Object: Object_1, console: console_1$3 } = globals;

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    // (4:4) {#if self}
    function create_if_block$3(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*self*/ ctx[6].paths && create_if_block_3(ctx);
    	let if_block1 = /*self*/ ctx[6].polygons && create_if_block_2(ctx);
    	let if_block2 = /*self*/ ctx[6].raw && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*self*/ ctx[6].paths) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 64) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*self*/ ctx[6].polygons) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 64) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*self*/ ctx[6].raw) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 64) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(4:4) {#if self}",
    		ctx
    	});

    	return block;
    }

    // (5:6) {#if self.paths}
    function create_if_block_3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*self*/ ctx[6].paths;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*self*/ 64) {
    				each_value_1 = /*self*/ ctx[6].paths;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(5:6) {#if self.paths}",
    		ctx
    	});

    	return block;
    }

    // (6:8) {#each self.paths as path, i}
    function create_each_block_1(ctx) {
    	let path;
    	let current;

    	path = new Path({
    			props: {
    				id: /*i*/ ctx[31],
    				data: /*path*/ ctx[32]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(path.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(path, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const path_changes = {};
    			if (dirty[0] & /*self*/ 64) path_changes.data = /*path*/ ctx[32];
    			path.$set(path_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(path.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(path.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(path, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(6:8) {#each self.paths as path, i}",
    		ctx
    	});

    	return block;
    }

    // (10:6) {#if self.polygons}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*self*/ ctx[6].polygons;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*self*/ 64) {
    				each_value = /*self*/ ctx[6].polygons;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(10:6) {#if self.polygons}",
    		ctx
    	});

    	return block;
    }

    // (11:8) {#each self.polygons as polygon, i}
    function create_each_block$2(ctx) {
    	let polygon;
    	let current;

    	polygon = new Polygon({
    			props: {
    				id: /*i*/ ctx[31],
    				data: /*polygon*/ ctx[29]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(polygon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(polygon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const polygon_changes = {};
    			if (dirty[0] & /*self*/ 64) polygon_changes.data = /*polygon*/ ctx[29];
    			polygon.$set(polygon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(polygon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(polygon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(polygon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(11:8) {#each self.polygons as polygon, i}",
    		ctx
    	});

    	return block;
    }

    // (15:6) {#if self.raw}
    function create_if_block_1(ctx) {
    	let raw;
    	let updating_data;
    	let current;

    	function raw_data_binding(value) {
    		/*raw_data_binding*/ ctx[15](value);
    	}

    	let raw_props = {};

    	if (/*self*/ ctx[6] !== void 0) {
    		raw_props.data = /*self*/ ctx[6];
    	}

    	raw = new Raw({ props: raw_props, $$inline: true });
    	binding_callbacks.push(() => bind$1(raw, 'data', raw_data_binding));

    	const block = {
    		c: function create() {
    			create_component(raw.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(raw, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const raw_changes = {};

    			if (!updating_data && dirty[0] & /*self*/ 64) {
    				updating_data = true;
    				raw_changes.data = /*self*/ ctx[6];
    				add_flush_callback(() => updating_data = false);
    			}

    			raw.$set(raw_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(raw.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(raw.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(raw, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:6) {#if self.raw}",
    		ctx
    	});

    	return block;
    }

    // (3:8)      
    function fallback_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*self*/ ctx[6] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*self*/ ctx[6]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 64) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(3:8)      ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>
    function create_default_slot(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 65536)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[16],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[16])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[16], dirty, null),
    						null
    					);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*self*/ 64)) {
    					default_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let svg;
    	let current;

    	svg = new Svg({
    			props: {
    				label: /*label*/ ctx[5],
    				width: /*width*/ ctx[7],
    				height: /*height*/ ctx[8],
    				box: /*box*/ ctx[10],
    				style: /*combinedStyle*/ ctx[9],
    				spin: /*spin*/ ctx[1],
    				flip: /*flip*/ ctx[4],
    				inverse: /*inverse*/ ctx[2],
    				pulse: /*pulse*/ ctx[3],
    				class: /*className*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(svg.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(svg, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const svg_changes = {};
    			if (dirty[0] & /*label*/ 32) svg_changes.label = /*label*/ ctx[5];
    			if (dirty[0] & /*width*/ 128) svg_changes.width = /*width*/ ctx[7];
    			if (dirty[0] & /*height*/ 256) svg_changes.height = /*height*/ ctx[8];
    			if (dirty[0] & /*box*/ 1024) svg_changes.box = /*box*/ ctx[10];
    			if (dirty[0] & /*combinedStyle*/ 512) svg_changes.style = /*combinedStyle*/ ctx[9];
    			if (dirty[0] & /*spin*/ 2) svg_changes.spin = /*spin*/ ctx[1];
    			if (dirty[0] & /*flip*/ 16) svg_changes.flip = /*flip*/ ctx[4];
    			if (dirty[0] & /*inverse*/ 4) svg_changes.inverse = /*inverse*/ ctx[2];
    			if (dirty[0] & /*pulse*/ 8) svg_changes.pulse = /*pulse*/ ctx[3];
    			if (dirty[0] & /*className*/ 1) svg_changes.class = /*className*/ ctx[0];

    			if (dirty[0] & /*$$scope, self*/ 65600) {
    				svg_changes.$$scope = { dirty, ctx };
    			}

    			svg.$set(svg_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(svg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(svg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(svg, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function normaliseData(data) {
    	if ('iconName' in data && 'icon' in data) {
    		let normalisedData = {};
    		let faIcon = data.icon;
    		let name = data.iconName;
    		let width = faIcon[0];
    		let height = faIcon[1];
    		let paths = faIcon[4];
    		let iconData = { width, height, paths: [{ d: paths }] };
    		normalisedData[name] = iconData;
    		return normalisedData;
    	}

    	return data;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Icon', slots, ['default']);
    	let { class: className = "" } = $$props;
    	let { data } = $$props;
    	let { scale = 1 } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { label = null } = $$props;
    	let self = null;
    	let { style = null } = $$props;

    	// internal
    	let x = 0;

    	let y = 0;
    	let childrenHeight = 0;
    	let childrenWidth = 0;
    	let outerScale = 1;
    	let width;
    	let height;
    	let combinedStyle;
    	let box;

    	function init() {
    		if (typeof data === 'undefined') {
    			return;
    		}

    		const normalisedData = normaliseData(data);
    		const [name] = Object.keys(normalisedData);
    		const icon = normalisedData[name];

    		if (!icon.paths) {
    			icon.paths = [];
    		}

    		if (icon.d) {
    			icon.paths.push({ d: icon.d });
    		}

    		if (!icon.polygons) {
    			icon.polygons = [];
    		}

    		if (icon.points) {
    			icon.polygons.push({ points: icon.points });
    		}

    		$$invalidate(6, self = icon);
    	}

    	function normalisedScale() {
    		let numScale = 1;

    		if (typeof scale !== 'undefined') {
    			numScale = Number(scale);
    		}

    		if (isNaN(numScale) || numScale <= 0) {
    			// eslint-disable-line no-restricted-globals
    			console.warn('Invalid prop: prop "scale" should be a number over 0.'); // eslint-disable-line no-console

    			return outerScale;
    		}

    		return numScale * outerScale;
    	}

    	function calculateBox() {
    		if (self) {
    			return `0 0 ${self.width} ${self.height}`;
    		}

    		return `0 0 ${width} ${height}`;
    	}

    	function calculateRatio() {
    		if (!self) {
    			return 1;
    		}

    		return Math.max(self.width, self.height) / 16;
    	}

    	function calculateWidth() {
    		if (childrenWidth) {
    			return childrenWidth;
    		}

    		if (self) {
    			return self.width / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateHeight() {
    		if (childrenHeight) {
    			return childrenHeight;
    		}

    		if (self) {
    			return self.height / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateStyle() {
    		let combined = "";

    		if (style !== null) {
    			combined += style;
    		}

    		let size = normalisedScale();

    		if (size === 1) {
    			if (combined.length === 0) {
    				return undefined;
    			}

    			return combined;
    		}

    		if (combined !== "" && !combined.endsWith(';')) {
    			combined += '; ';
    		}

    		return `${combined}font-size: ${size}em`;
    	}

    	const writable_props = ['class', 'data', 'scale', 'spin', 'inverse', 'pulse', 'flip', 'label', 'style'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	function raw_data_binding(value) {
    		self = value;
    		$$invalidate(6, self);
    	}

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, className = $$props.class);
    		if ('data' in $$props) $$invalidate(11, data = $$props.data);
    		if ('scale' in $$props) $$invalidate(12, scale = $$props.scale);
    		if ('spin' in $$props) $$invalidate(1, spin = $$props.spin);
    		if ('inverse' in $$props) $$invalidate(2, inverse = $$props.inverse);
    		if ('pulse' in $$props) $$invalidate(3, pulse = $$props.pulse);
    		if ('flip' in $$props) $$invalidate(4, flip = $$props.flip);
    		if ('label' in $$props) $$invalidate(5, label = $$props.label);
    		if ('style' in $$props) $$invalidate(13, style = $$props.style);
    		if ('$$scope' in $$props) $$invalidate(16, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		Path,
    		Polygon,
    		Raw,
    		Svg,
    		className,
    		data,
    		scale,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		self,
    		style,
    		x,
    		y,
    		childrenHeight,
    		childrenWidth,
    		outerScale,
    		width,
    		height,
    		combinedStyle,
    		box,
    		init,
    		normaliseData,
    		normalisedScale,
    		calculateBox,
    		calculateRatio,
    		calculateWidth,
    		calculateHeight,
    		calculateStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ('className' in $$props) $$invalidate(0, className = $$props.className);
    		if ('data' in $$props) $$invalidate(11, data = $$props.data);
    		if ('scale' in $$props) $$invalidate(12, scale = $$props.scale);
    		if ('spin' in $$props) $$invalidate(1, spin = $$props.spin);
    		if ('inverse' in $$props) $$invalidate(2, inverse = $$props.inverse);
    		if ('pulse' in $$props) $$invalidate(3, pulse = $$props.pulse);
    		if ('flip' in $$props) $$invalidate(4, flip = $$props.flip);
    		if ('label' in $$props) $$invalidate(5, label = $$props.label);
    		if ('self' in $$props) $$invalidate(6, self = $$props.self);
    		if ('style' in $$props) $$invalidate(13, style = $$props.style);
    		if ('x' in $$props) x = $$props.x;
    		if ('y' in $$props) y = $$props.y;
    		if ('childrenHeight' in $$props) childrenHeight = $$props.childrenHeight;
    		if ('childrenWidth' in $$props) childrenWidth = $$props.childrenWidth;
    		if ('outerScale' in $$props) outerScale = $$props.outerScale;
    		if ('width' in $$props) $$invalidate(7, width = $$props.width);
    		if ('height' in $$props) $$invalidate(8, height = $$props.height);
    		if ('combinedStyle' in $$props) $$invalidate(9, combinedStyle = $$props.combinedStyle);
    		if ('box' in $$props) $$invalidate(10, box = $$props.box);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*data, style, scale*/ 14336) {
    			{
    				init();
    				$$invalidate(7, width = calculateWidth());
    				$$invalidate(8, height = calculateHeight());
    				$$invalidate(9, combinedStyle = calculateStyle());
    				$$invalidate(10, box = calculateBox());
    			}
    		}
    	};

    	return [
    		className,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		self,
    		width,
    		height,
    		combinedStyle,
    		box,
    		data,
    		scale,
    		style,
    		slots,
    		raw_data_binding,
    		$$scope
    	];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{
    				class: 0,
    				data: 11,
    				scale: 12,
    				spin: 1,
    				inverse: 2,
    				pulse: 3,
    				flip: 4,
    				label: 5,
    				style: 13
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[11] === undefined && !('data' in props)) {
    			console_1$3.warn("<Icon> was created without expected prop 'data'");
    		}
    	}

    	get class() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scale() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scale(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var times = { times: { width: 1408, height: 1792, paths: [{ d: 'M1298 1322q0 40-28 68l-136 136q-28 28-68 28t-68-28l-294-294-294 294q-28 28-68 28t-68-28l-136-136q-28-28-28-68t28-68l294-294-294-294q-28-28-28-68t28-68l136-136q28-28 68-28t68 28l294 294 294-294q28-28 68-28t68 28l136 136q28 28 28 68t-28 68l-294 294 294 294q28 28 28 68z' }] } };

    var refresh = { refresh: { width: 1536, height: 1792, paths: [{ d: 'M1511 1056q0 5-1 7-64 268-268 434.5t-478 166.5q-146 0-282.5-55t-243.5-157l-129 129q-19 19-45 19t-45-19-19-45v-448q0-26 19-45t45-19h448q26 0 45 19t19 45-19 45l-137 137q71 66 161 102t187 36q134 0 250-65t186-179q11-17 53-117 8-23 30-23h192q13 0 22.5 9.5t9.5 22.5zM1536 256v448q0 26-19 45t-45 19h-448q-26 0-45-19t-19-45 19-45l138-138q-148-137-349-137-134 0-250 65t-186 179q-11 17-53 117-8 23-30 23h-199q-13 0-22.5-9.5t-9.5-22.5v-7q65-268 270-434.5t480-166.5q146 0 284 55.5t245 156.5l130-129q19-19 45-19t45 19 19 45z' }] } };

    var bind = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return Array.isArray(val);
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return toString.call(val) === '[object FormData]';
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (toString.call(val) !== '[object Object]') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate$1(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return toString.call(val) === '[object URLSearchParams]';
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate$1,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected,
        synchronous: options ? options.synchronous : false,
        runWhen: options ? options.runWhen : null
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code,
          status: this.response && this.response.status ? this.response.status : null
        };
      };
      return error;
    };

    var transitional = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;
        var responseType = config.responseType;
        var onCanceled;
        function done() {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(onCanceled);
          }

          if (config.signal) {
            config.signal.removeEventListener('abort', onCanceled);
          }
        }

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        function onloadend() {
          if (!request) {
            return;
          }
          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
            request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(function _resolve(value) {
            resolve(value);
            done();
          }, function _reject(err) {
            reject(err);
            done();
          }, response);

          // Clean up request
          request = null;
        }

        if ('onloadend' in request) {
          // Use onloadend if available
          request.onloadend = onloadend;
        } else {
          // Listen for ready state to emulate onloadend
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }

            // The request errored out and we didn't get a response, this will be
            // handled by onerror instead
            // With one exception: request that using file: protocol, most browsers
            // will return status as 0 even though it's a successful request
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
              return;
            }
            // readystate handler is calling before onerror or ontimeout handlers,
            // so we should call onloadend on the next 'tick'
            setTimeout(onloadend);
          };
        }

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
          var transitional$1 = config.transitional || transitional;
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(
            timeoutErrorMessage,
            config,
            transitional$1.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (responseType && responseType !== 'json') {
          request.responseType = config.responseType;
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken || config.signal) {
          // Handle cancellation
          // eslint-disable-next-line func-names
          onCanceled = function(cancel) {
            if (!request) {
              return;
            }
            reject(!cancel || (cancel && cancel.type) ? new Cancel_1('canceled') : cancel);
            request.abort();
            request = null;
          };

          config.cancelToken && config.cancelToken.subscribe(onCanceled);
          if (config.signal) {
            config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
          }
        }

        if (!requestData) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    function stringifySafely(rawValue, parser, encoder) {
      if (utils.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils.trim(rawValue);
        } catch (e) {
          if (e.name !== 'SyntaxError') {
            throw e;
          }
        }
      }

      return (encoder || JSON.stringify)(rawValue);
    }

    var defaults = {

      transitional: transitional,

      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');

        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
          setContentTypeIfUnset(headers, 'application/json');
          return stringifySafely(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        var transitional = this.transitional || defaults.transitional;
        var silentJSONParsing = transitional && transitional.silentJSONParsing;
        var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

        if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
          try {
            return JSON.parse(data);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === 'SyntaxError') {
                throw enhanceError(e, this, 'E_JSON_PARSE');
              }
              throw e;
            }
          }
        }

        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      },

      headers: {
        common: {
          'Accept': 'application/json, text/plain, */*'
        }
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      var context = this || defaults_1;
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn.call(context, data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }

      if (config.signal && config.signal.aborted) {
        throw new Cancel_1('canceled');
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData.call(
        config,
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData.call(
          config,
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      // eslint-disable-next-line consistent-return
      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(undefined, config2[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(undefined, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function mergeDirectKeys(prop) {
        if (prop in config2) {
          return getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      var mergeMap = {
        'url': valueFromConfig2,
        'method': valueFromConfig2,
        'data': valueFromConfig2,
        'baseURL': defaultToConfig2,
        'transformRequest': defaultToConfig2,
        'transformResponse': defaultToConfig2,
        'paramsSerializer': defaultToConfig2,
        'timeout': defaultToConfig2,
        'timeoutMessage': defaultToConfig2,
        'withCredentials': defaultToConfig2,
        'adapter': defaultToConfig2,
        'responseType': defaultToConfig2,
        'xsrfCookieName': defaultToConfig2,
        'xsrfHeaderName': defaultToConfig2,
        'onUploadProgress': defaultToConfig2,
        'onDownloadProgress': defaultToConfig2,
        'decompress': defaultToConfig2,
        'maxContentLength': defaultToConfig2,
        'maxBodyLength': defaultToConfig2,
        'transport': defaultToConfig2,
        'httpAgent': defaultToConfig2,
        'httpsAgent': defaultToConfig2,
        'cancelToken': defaultToConfig2,
        'socketPath': defaultToConfig2,
        'responseEncoding': defaultToConfig2,
        'validateStatus': mergeDirectKeys
      };

      utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
        var merge = mergeMap[prop] || mergeDeepProperties;
        var configValue = merge(prop);
        (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
      });

      return config;
    };

    var data = {
      "version": "0.26.1"
    };

    var VERSION = data.version;

    var validators$1 = {};

    // eslint-disable-next-line func-names
    ['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
      validators$1[type] = function validator(thing) {
        return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
      };
    });

    var deprecatedWarnings = {};

    /**
     * Transitional option validator
     * @param {function|boolean?} validator - set to false if the transitional option has been removed
     * @param {string?} version - deprecated version / removed since version
     * @param {string?} message - some message with additional info
     * @returns {function}
     */
    validators$1.transitional = function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
        return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
      }

      // eslint-disable-next-line func-names
      return function(value, opt, opts) {
        if (validator === false) {
          throw new Error(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')));
        }

        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          // eslint-disable-next-line no-console
          console.warn(
            formatMessage(
              opt,
              ' has been deprecated since v' + version + ' and will be removed in the near future'
            )
          );
        }

        return validator ? validator(value, opt, opts) : true;
      };
    };

    /**
     * Assert object's properties type
     * @param {object} options
     * @param {object} schema
     * @param {boolean?} allowUnknown
     */

    function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== 'object') {
        throw new TypeError('options must be an object');
      }
      var keys = Object.keys(options);
      var i = keys.length;
      while (i-- > 0) {
        var opt = keys[i];
        var validator = schema[opt];
        if (validator) {
          var value = options[opt];
          var result = value === undefined || validator(value, opt, options);
          if (result !== true) {
            throw new TypeError('option ' + opt + ' must be ' + result);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw Error('Unknown option ' + opt);
        }
      }
    }

    var validator = {
      assertOptions: assertOptions,
      validators: validators$1
    };

    var validators = validator.validators;
    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(configOrUrl, config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof configOrUrl === 'string') {
        config = config || {};
        config.url = configOrUrl;
      } else {
        config = configOrUrl || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      var transitional = config.transitional;

      if (transitional !== undefined) {
        validator.assertOptions(transitional, {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean)
        }, false);
      }

      // filter out skipped interceptors
      var requestInterceptorChain = [];
      var synchronousRequestInterceptors = true;
      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
          return;
        }

        synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      var responseInterceptorChain = [];
      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      });

      var promise;

      if (!synchronousRequestInterceptors) {
        var chain = [dispatchRequest, undefined];

        Array.prototype.unshift.apply(chain, requestInterceptorChain);
        chain = chain.concat(responseInterceptorChain);

        promise = Promise.resolve(config);
        while (chain.length) {
          promise = promise.then(chain.shift(), chain.shift());
        }

        return promise;
      }


      var newConfig = config;
      while (requestInterceptorChain.length) {
        var onFulfilled = requestInterceptorChain.shift();
        var onRejected = requestInterceptorChain.shift();
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error) {
          onRejected(error);
          break;
        }
      }

      try {
        promise = dispatchRequest(newConfig);
      } catch (error) {
        return Promise.reject(error);
      }

      while (responseInterceptorChain.length) {
        promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: (config || {}).data
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;

      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;

      // eslint-disable-next-line func-names
      this.promise.then(function(cancel) {
        if (!token._listeners) return;

        var i;
        var l = token._listeners.length;

        for (i = 0; i < l; i++) {
          token._listeners[i](cancel);
        }
        token._listeners = null;
      });

      // eslint-disable-next-line func-names
      this.promise.then = function(onfulfilled) {
        var _resolve;
        // eslint-disable-next-line func-names
        var promise = new Promise(function(resolve) {
          token.subscribe(resolve);
          _resolve = resolve;
        }).then(onfulfilled);

        promise.cancel = function reject() {
          token.unsubscribe(_resolve);
        };

        return promise;
      };

      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Subscribe to the cancel signal
     */

    CancelToken.prototype.subscribe = function subscribe(listener) {
      if (this.reason) {
        listener(this.reason);
        return;
      }

      if (this._listeners) {
        this._listeners.push(listener);
      } else {
        this._listeners = [listener];
      }
    };

    /**
     * Unsubscribe from the cancel signal
     */

    CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
      if (!this._listeners) {
        return;
      }
      var index = this._listeners.indexOf(listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    var isAxiosError = function isAxiosError(payload) {
      return utils.isObject(payload) && (payload.isAxiosError === true);
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      // Factory for creating new instances
      instance.create = function create(instanceConfig) {
        return createInstance(mergeConfig(defaultConfig, instanceConfig));
      };

      return instance;
    }

    // Create the default instance to be exported
    var axios$1 = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios$1.Axios = Axios_1;

    // Expose Cancel & CancelToken
    axios$1.Cancel = Cancel_1;
    axios$1.CancelToken = CancelToken_1;
    axios$1.isCancel = isCancel;
    axios$1.VERSION = data.version;

    // Expose all/spread
    axios$1.all = function all(promises) {
      return Promise.all(promises);
    };
    axios$1.spread = spread;

    // Expose isAxiosError
    axios$1.isAxiosError = isAxiosError;

    var axios_1 = axios$1;

    // Allow use of default import syntax in TypeScript
    var _default = axios$1;
    axios_1.default = _default;

    var axios = axios_1;

    /* src/views/admin/LunchMenuAdmin.svelte generated by Svelte v3.46.4 */

    const { console: console_1$2 } = globals;
    const file$4 = "src/views/admin/LunchMenuAdmin.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (112:4) {:else}
    function create_else_block$1(ctx) {
    	let button;
    	let t1;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t3;
    	let th1;
    	let t5;
    	let th2;
    	let t6;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*lunchWeekList*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Add Lunch Week";
    			t1 = space();
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Week Of";
    			t3 = space();
    			th1 = element("th");
    			th1.textContent = "Published";
    			t5 = space();
    			th2 = element("th");
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(button, "class", "button is-text is-small mb-1");
    			add_location(button, file$4, 112, 8, 3447);
    			add_location(th0, file$4, 121, 20, 3697);
    			add_location(th1, file$4, 122, 20, 3734);
    			add_location(th2, file$4, 123, 20, 3773);
    			add_location(tr, file$4, 120, 16, 3672);
    			add_location(thead, file$4, 119, 12, 3648);
    			attr_dev(table, "class", "table");
    			add_location(table, file$4, 118, 8, 3614);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t3);
    			append_dev(tr, th1);
    			append_dev(tr, t5);
    			append_dev(tr, th2);
    			append_dev(table, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openDeleteModal, lunchWeekList, times, openLunchWeekDetails*/ 1153) {
    				each_value = /*lunchWeekList*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(table, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(112:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (108:4) {#if loading}
    function create_if_block$2(ctx) {
    	let div;
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { spin: true, data: refresh, scale: "3" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(icon.$$.fragment);
    			attr_dev(div, "class", "section");
    			add_location(div, file$4, 108, 8, 3339);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(icon, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(icon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(108:4) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (127:12) {#each lunchWeekList as lunchWeek}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*lunchWeek*/ ctx[19].weekOf + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*lunchWeek*/ ctx[19].isPublished + "";
    	let t2;
    	let t3;
    	let td2;
    	let icon;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;

    	icon = new Icon({
    			props: { style: "margin-top: 4px;", data: times },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			create_component(icon.$$.fragment);
    			t4 = space();
    			attr_dev(td0, "class", "has-text-link clickable svelte-s66s5j");
    			add_location(td0, file$4, 128, 20, 3911);
    			add_location(td1, file$4, 133, 20, 4128);
    			attr_dev(td2, "class", "has-text-grey-light clickable svelte-s66s5j");
    			add_location(td2, file$4, 135, 20, 4269);
    			add_location(tr, file$4, 127, 16, 3886);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			mount_component(icon, td2, null);
    			append_dev(tr, t4);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						td0,
    						"click",
    						function () {
    							if (is_function(/*openLunchWeekDetails*/ ctx[7](/*lunchWeek*/ ctx[19]))) /*openLunchWeekDetails*/ ctx[7](/*lunchWeek*/ ctx[19]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						td2,
    						"click",
    						function () {
    							if (is_function(/*openDeleteModal*/ ctx[10](/*lunchWeek*/ ctx[19]))) /*openDeleteModal*/ ctx[10](/*lunchWeek*/ ctx[19]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*lunchWeekList*/ 1) && t0_value !== (t0_value = /*lunchWeek*/ ctx[19].weekOf + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*lunchWeekList*/ 1) && t2_value !== (t2_value = /*lunchWeek*/ ctx[19].isPublished + "")) set_data_dev(t2, t2_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_component(icon);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(127:12) {#each lunchWeekList as lunchWeek}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div0;
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let a1;
    	let t3;
    	let li2;
    	let a2;
    	let t4_value = /*$user*/ ctx[6].schoolName + "";
    	let t4;
    	let t5;
    	let current_block_type_index;
    	let if_block;
    	let t6;
    	let div5;
    	let div1;
    	let t7;
    	let div4;
    	let header0;
    	let p0;
    	let t9;
    	let button0;
    	let t10;
    	let section0;
    	let div3;
    	let label;
    	let t12;
    	let div2;
    	let input;
    	let t13;
    	let footer0;
    	let button1;
    	let t15;
    	let button2;
    	let div5_class_value;
    	let t17;
    	let div8;
    	let div6;
    	let t18;
    	let div7;
    	let header1;
    	let p1;
    	let t20;
    	let button3;
    	let t21;
    	let section1;
    	let t22;
    	let t23_value = /*weekToDelete*/ ctx[5].weekOf + "";
    	let t23;
    	let t24;
    	let t25;
    	let footer1;
    	let button4;
    	let t27;
    	let button5;
    	let div8_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block$2, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Home";
    			t1 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Lunch Menu Administration";
    			t3 = space();
    			li2 = element("li");
    			a2 = element("a");
    			t4 = text(t4_value);
    			t5 = space();
    			if_block.c();
    			t6 = space();
    			div5 = element("div");
    			div1 = element("div");
    			t7 = space();
    			div4 = element("div");
    			header0 = element("header");
    			p0 = element("p");
    			p0.textContent = "Create Lunch Week";
    			t9 = space();
    			button0 = element("button");
    			t10 = space();
    			section0 = element("section");
    			div3 = element("div");
    			label = element("label");
    			label.textContent = "Week Of";
    			t12 = space();
    			div2 = element("div");
    			input = element("input");
    			t13 = space();
    			footer0 = element("footer");
    			button1 = element("button");
    			button1.textContent = "Continue";
    			t15 = space();
    			button2 = element("button");
    			button2.textContent = "Cancel";
    			t17 = space();
    			div8 = element("div");
    			div6 = element("div");
    			t18 = space();
    			div7 = element("div");
    			header1 = element("header");
    			p1 = element("p");
    			p1.textContent = "Warning";
    			t20 = space();
    			button3 = element("button");
    			t21 = space();
    			section1 = element("section");
    			t22 = text("Delete Week of ");
    			t23 = text(t23_value);
    			t24 = text("?");
    			t25 = space();
    			footer1 = element("footer");
    			button4 = element("button");
    			button4.textContent = "Continue";
    			t27 = space();
    			button5 = element("button");
    			button5.textContent = "Cancel";
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$4, 97, 16, 3033);
    			add_location(li0, file$4, 96, 12, 3012);
    			attr_dev(a1, "href", "/admin/manage-menus");
    			add_location(a1, file$4, 100, 16, 3105);
    			add_location(li1, file$4, 99, 12, 3084);
    			attr_dev(a2, "href", "/#");
    			add_location(a2, file$4, 103, 16, 3234);
    			attr_dev(li2, "class", "is-active");
    			add_location(li2, file$4, 102, 12, 3195);
    			add_location(ul, file$4, 95, 8, 2995);
    			attr_dev(nav, "class", "breadcrumb");
    			attr_dev(nav, "aria-label", "breadcrumbs");
    			add_location(nav, file$4, 94, 4, 2937);
    			add_location(div0, file$4, 93, 0, 2927);
    			attr_dev(div1, "class", "modal-background");
    			add_location(div1, file$4, 149, 4, 4701);
    			attr_dev(p0, "class", "modal-card-title");
    			add_location(p0, file$4, 152, 8, 4814);
    			attr_dev(button0, "class", "delete");
    			attr_dev(button0, "aria-label", "close");
    			add_location(button0, file$4, 153, 8, 4872);
    			attr_dev(header0, "class", "modal-card-head");
    			add_location(header0, file$4, 151, 6, 4773);
    			attr_dev(label, "class", "label");
    			attr_dev(label, "for", "week-of");
    			add_location(label, file$4, 157, 10, 5063);
    			attr_dev(input, "id", "week-of");
    			attr_dev(input, "type", "date");
    			attr_dev(input, "class", "input");
    			attr_dev(input, "placeholder", "yyyy-mm-dd");
    			add_location(input, file$4, 160, 12, 5251);
    			attr_dev(div2, "class", "control");
    			add_location(div2, file$4, 158, 10, 5124);
    			attr_dev(div3, "class", "field");
    			add_location(div3, file$4, 156, 8, 5033);
    			attr_dev(section0, "class", "modal-card-body");
    			add_location(section0, file$4, 155, 6, 4991);
    			attr_dev(button1, "class", "button is-success");
    			add_location(button1, file$4, 165, 8, 5453);
    			attr_dev(button2, "class", "button");
    			add_location(button2, file$4, 166, 8, 5550);
    			attr_dev(footer0, "class", "modal-card-foot");
    			add_location(footer0, file$4, 164, 6, 5412);
    			attr_dev(div4, "class", "modal-card");
    			add_location(div4, file$4, 150, 4, 4742);
    			attr_dev(div5, "class", div5_class_value = /*showCreateModal*/ ctx[2] ? 'modal is-active' : 'modal');
    			add_location(div5, file$4, 148, 0, 4635);
    			attr_dev(div6, "class", "modal-background");
    			add_location(div6, file$4, 173, 4, 5774);
    			attr_dev(p1, "class", "modal-card-title");
    			add_location(p1, file$4, 176, 12, 5889);
    			attr_dev(button3, "class", "delete");
    			attr_dev(button3, "aria-label", "close");
    			add_location(button3, file$4, 177, 12, 5941);
    			attr_dev(header1, "class", "modal-card-head");
    			add_location(header1, file$4, 175, 8, 5844);
    			attr_dev(section1, "class", "modal-card-body");
    			add_location(section1, file$4, 183, 8, 6115);
    			attr_dev(button4, "class", "button is-success");
    			add_location(button4, file$4, 187, 12, 6271);
    			attr_dev(button5, "class", "button");
    			add_location(button5, file$4, 191, 12, 6421);
    			attr_dev(footer1, "class", "modal-card-foot");
    			add_location(footer1, file$4, 186, 8, 6226);
    			attr_dev(div7, "class", "modal-card");
    			add_location(div7, file$4, 174, 4, 5811);
    			attr_dev(div8, "class", div8_class_value = /*showDeleteModal*/ ctx[4] ? "modal is-active" : "modal");
    			add_location(div8, file$4, 172, 0, 5710);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(a2, t4);
    			append_dev(div0, t5);
    			if_blocks[current_block_type_index].m(div0, null);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div1);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, header0);
    			append_dev(header0, p0);
    			append_dev(header0, t9);
    			append_dev(header0, button0);
    			append_dev(div4, t10);
    			append_dev(div4, section0);
    			append_dev(section0, div3);
    			append_dev(div3, label);
    			append_dev(div3, t12);
    			append_dev(div3, div2);
    			append_dev(div2, input);
    			set_input_value(input, /*createWeekOfDate*/ ctx[3]);
    			append_dev(div4, t13);
    			append_dev(div4, footer0);
    			append_dev(footer0, button1);
    			append_dev(footer0, t15);
    			append_dev(footer0, button2);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div6);
    			append_dev(div8, t18);
    			append_dev(div8, div7);
    			append_dev(div7, header1);
    			append_dev(header1, p1);
    			append_dev(header1, t20);
    			append_dev(header1, button3);
    			append_dev(div7, t21);
    			append_dev(div7, section1);
    			append_dev(section1, t22);
    			append_dev(section1, t23);
    			append_dev(section1, t24);
    			append_dev(div7, t25);
    			append_dev(div7, footer1);
    			append_dev(footer1, button4);
    			append_dev(footer1, t27);
    			append_dev(footer1, button5);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_1*/ ctx[13], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[14]),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[15], false, false, false),
    					listen_dev(button2, "click", /*click_handler_3*/ ctx[16], false, false, false),
    					listen_dev(button3, "click", /*click_handler_4*/ ctx[17], false, false, false),
    					listen_dev(
    						button4,
    						"click",
    						function () {
    							if (is_function(/*deleteLunchWeek*/ ctx[11](/*weekToDelete*/ ctx[5]))) /*deleteLunchWeek*/ ctx[11](/*weekToDelete*/ ctx[5]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(button5, "click", /*click_handler_5*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*$user*/ 64) && t4_value !== (t4_value = /*$user*/ ctx[6].schoolName + "")) set_data_dev(t4, t4_value);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div0, null);
    			}

    			if (dirty & /*createWeekOfDate*/ 8) {
    				set_input_value(input, /*createWeekOfDate*/ ctx[3]);
    			}

    			if (!current || dirty & /*showCreateModal*/ 4 && div5_class_value !== (div5_class_value = /*showCreateModal*/ ctx[2] ? 'modal is-active' : 'modal')) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			if ((!current || dirty & /*weekToDelete*/ 32) && t23_value !== (t23_value = /*weekToDelete*/ ctx[5].weekOf + "")) set_data_dev(t23, t23_value);

    			if (!current || dirty & /*showDeleteModal*/ 16 && div8_class_value !== (div8_class_value = /*showDeleteModal*/ ctx[4] ? "modal is-active" : "modal")) {
    				attr_dev(div8, "class", div8_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(div8);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $user;
    	validate_store(user, 'user');
    	component_subscribe($$self, user, $$value => $$invalidate(6, $user = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LunchMenuAdmin', slots, []);
    	let lunchWeekList = [];
    	let loading = true;
    	let showCreateModal = false;
    	let createWeekOfDate = null;
    	let showDeleteModal = false;
    	let weekToDelete = {};

    	onMount(async () => {
    		try {
    			let response = await axios.get(`${"http://localhost:3000"}/api/lunch-weeks`);
    			$$invalidate(0, lunchWeekList = response.data);
    			$$invalidate(1, loading = false);
    		} catch(error) {
    			console.error("Error fetching lunch weeks", error);
    		}
    	});

    	async function openLunchWeekDetails(lunchWeek) {
    		const route = `/admin/manage-menus/week-details/${lunchWeek.lunchWeekId}`;
    		navigateTo(route);
    	}

    	function openCreateModal() {
    		$$invalidate(2, showCreateModal = true);
    	}

    	const createLunchWeek = async () => {
    		$$invalidate(2, showCreateModal = false);

    		let newLunchWeek = {
    			weekOf: createWeekOfDate, // createWeekOfDate will contain the input from the user
    			isPublished: false
    		};

    		try {
    			$$invalidate(1, loading = true);

    			// since this is a POST, we need to send a lunchWeek object as the body of the request
    			const response = await axios.post(`${"http://localhost:3000"}/api/lunch-weeks`, newLunchWeek);

    			const lunchWeekId = response.data.lunchWeekId;

    			// populate the newLunchWeek with the id from the server response
    			newLunchWeek.lunchWeekId = lunchWeekId;

    			// push the result into lunchWeek list, so that
    			// Svelte will update the table
    			lunchWeekList.push(newLunchWeek);

    			$$invalidate(1, loading = false);
    		} catch(e) {
    			$$invalidate(1, loading = false);
    			console.error(e);
    		}
    	};

    	function openDeleteModal(lunchWeek) {
    		$$invalidate(5, weekToDelete = lunchWeek);
    		$$invalidate(4, showDeleteModal = true);
    	}

    	async function deleteLunchWeek(lunchWeek) {
    		$$invalidate(4, showDeleteModal = false);
    		const lunchWeekId = lunchWeek.lunchWeekId;

    		try {
    			// show the loading spinner and call the delete endpoint
    			$$invalidate(1, loading = true);

    			await axios.delete(`${"http://localhost:3000"}/api/lunch-weeks/${lunchWeekId}`);

    			// find the index of the passed in lunchWeek and use splice to remove it
    			const deletedIndex = lunchWeekList.findIndex(x => x.lunchWeekId === lunchWeekId);

    			lunchWeekList.splice(deletedIndex, 1);
    			$$invalidate(1, loading = false);
    		} catch(e) {
    			$$invalidate(1, loading = false);
    			console.error(e);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<LunchMenuAdmin> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => openCreateModal();
    	const click_handler_1 = () => $$invalidate(2, showCreateModal = false);

    	function input_input_handler() {
    		createWeekOfDate = this.value;
    		$$invalidate(3, createWeekOfDate);
    	}

    	const click_handler_2 = () => createLunchWeek();
    	const click_handler_3 = () => $$invalidate(2, showCreateModal = false);
    	const click_handler_4 = () => $$invalidate(4, showDeleteModal = false);
    	const click_handler_5 = () => $$invalidate(4, showDeleteModal = false);

    	$$self.$capture_state = () => ({
    		user,
    		onMount,
    		navigateTo,
    		Icon,
    		refresh,
    		times,
    		axios,
    		lunchWeekList,
    		loading,
    		showCreateModal,
    		createWeekOfDate,
    		showDeleteModal,
    		weekToDelete,
    		openLunchWeekDetails,
    		openCreateModal,
    		createLunchWeek,
    		openDeleteModal,
    		deleteLunchWeek,
    		$user
    	});

    	$$self.$inject_state = $$props => {
    		if ('lunchWeekList' in $$props) $$invalidate(0, lunchWeekList = $$props.lunchWeekList);
    		if ('loading' in $$props) $$invalidate(1, loading = $$props.loading);
    		if ('showCreateModal' in $$props) $$invalidate(2, showCreateModal = $$props.showCreateModal);
    		if ('createWeekOfDate' in $$props) $$invalidate(3, createWeekOfDate = $$props.createWeekOfDate);
    		if ('showDeleteModal' in $$props) $$invalidate(4, showDeleteModal = $$props.showDeleteModal);
    		if ('weekToDelete' in $$props) $$invalidate(5, weekToDelete = $$props.weekToDelete);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		lunchWeekList,
    		loading,
    		showCreateModal,
    		createWeekOfDate,
    		showDeleteModal,
    		weekToDelete,
    		$user,
    		openLunchWeekDetails,
    		openCreateModal,
    		createLunchWeek,
    		openDeleteModal,
    		deleteLunchWeek,
    		click_handler,
    		click_handler_1,
    		input_input_handler,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5
    	];
    }

    class LunchMenuAdmin extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LunchMenuAdmin",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    function toInteger(dirtyNumber) {
      if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
        return NaN;
      }

      var number = Number(dirtyNumber);

      if (isNaN(number)) {
        return number;
      }

      return number < 0 ? Math.ceil(number) : Math.floor(number);
    }

    function requiredArgs(required, args) {
      if (args.length < required) {
        throw new TypeError(required + ' argument' + (required > 1 ? 's' : '') + ' required, but only ' + args.length + ' present');
      }
    }

    /**
     * @name toDate
     * @category Common Helpers
     * @summary Convert the given argument to an instance of Date.
     *
     * @description
     * Convert the given argument to an instance of Date.
     *
     * If the argument is an instance of Date, the function returns its clone.
     *
     * If the argument is a number, it is treated as a timestamp.
     *
     * If the argument is none of the above, the function returns Invalid Date.
     *
     * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
     *
     * @param {Date|Number} argument - the value to convert
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Clone the date:
     * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert the timestamp to date:
     * const result = toDate(1392098430000)
     * //=> Tue Feb 11 2014 11:30:30
     */

    function toDate(argument) {
      requiredArgs(1, arguments);
      var argStr = Object.prototype.toString.call(argument); // Clone the date

      if (argument instanceof Date || typeof argument === 'object' && argStr === '[object Date]') {
        // Prevent the date to lose the milliseconds when passed to new Date() in IE10
        return new Date(argument.getTime());
      } else if (typeof argument === 'number' || argStr === '[object Number]') {
        return new Date(argument);
      } else {
        if ((typeof argument === 'string' || argStr === '[object String]') && typeof console !== 'undefined') {
          // eslint-disable-next-line no-console
          console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule"); // eslint-disable-next-line no-console

          console.warn(new Error().stack);
        }

        return new Date(NaN);
      }
    }

    /**
     * @name addDays
     * @category Day Helpers
     * @summary Add the specified number of days to the given date.
     *
     * @description
     * Add the specified number of days to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of days to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} - the new date with the days added
     * @throws {TypeError} - 2 arguments required
     *
     * @example
     * // Add 10 days to 1 September 2014:
     * const result = addDays(new Date(2014, 8, 1), 10)
     * //=> Thu Sep 11 2014 00:00:00
     */

    function addDays(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var amount = toInteger(dirtyAmount);

      if (isNaN(amount)) {
        return new Date(NaN);
      }

      if (!amount) {
        // If 0 days, no-op to avoid changing times in the hour before end of DST
        return date;
      }

      date.setDate(date.getDate() + amount);
      return date;
    }

    /**
     * @name addMonths
     * @category Month Helpers
     * @summary Add the specified number of months to the given date.
     *
     * @description
     * Add the specified number of months to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of months to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the months added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add 5 months to 1 September 2014:
     * const result = addMonths(new Date(2014, 8, 1), 5)
     * //=> Sun Feb 01 2015 00:00:00
     */

    function addMonths(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var amount = toInteger(dirtyAmount);

      if (isNaN(amount)) {
        return new Date(NaN);
      }

      if (!amount) {
        // If 0 months, no-op to avoid changing times in the hour before end of DST
        return date;
      }

      var dayOfMonth = date.getDate(); // The JS Date object supports date math by accepting out-of-bounds values for
      // month, day, etc. For example, new Date(2020, 0, 0) returns 31 Dec 2019 and
      // new Date(2020, 13, 1) returns 1 Feb 2021.  This is *almost* the behavior we
      // want except that dates will wrap around the end of a month, meaning that
      // new Date(2020, 13, 31) will return 3 Mar 2021 not 28 Feb 2021 as desired. So
      // we'll default to the end of the desired month by adding 1 to the desired
      // month and using a date of 0 to back up one day to the end of the desired
      // month.

      var endOfDesiredMonth = new Date(date.getTime());
      endOfDesiredMonth.setMonth(date.getMonth() + amount + 1, 0);
      var daysInMonth = endOfDesiredMonth.getDate();

      if (dayOfMonth >= daysInMonth) {
        // If we're already at the end of the month, then this is the correct date
        // and we're done.
        return endOfDesiredMonth;
      } else {
        // Otherwise, we now know that setting the original day-of-month value won't
        // cause an overflow, so set the desired day-of-month. Note that we can't
        // just set the date of `endOfDesiredMonth` because that object may have had
        // its time changed in the unusual case where where a DST transition was on
        // the last day of the month and its local time was in the hour skipped or
        // repeated next to a DST transition.  So we use `date` instead which is
        // guaranteed to still have the original time.
        date.setFullYear(endOfDesiredMonth.getFullYear(), endOfDesiredMonth.getMonth(), dayOfMonth);
        return date;
      }
    }

    /**
     * @name add
     * @category Common Helpers
     * @summary Add the specified years, months, weeks, days, hours, minutes and seconds to the given date.
     *
     * @description
     * Add the specified years, months, weeks, days, hours, minutes and seconds to the given date.
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Duration} duration - the object with years, months, weeks, days, hours, minutes and seconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     *
     * | Key            | Description                        |
     * |----------------|------------------------------------|
     * | years          | Amount of years to be added        |
     * | months         | Amount of months to be added       |
     * | weeks          | Amount of weeks to be added        |
     * | days           | Amount of days to be added         |
     * | hours          | Amount of hours to be added        |
     * | minutes        | Amount of minutes to be added      |
     * | seconds        | Amount of seconds to be added      |
     *
     * All values default to 0
     *
     * @returns {Date} the new date with the seconds added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add the following duration to 1 September 2014, 10:19:50
     * const result = add(new Date(2014, 8, 1, 10, 19, 50), {
     *   years: 2,
     *   months: 9,
     *   weeks: 1,
     *   days: 7,
     *   hours: 5,
     *   minutes: 9,
     *   seconds: 30,
     * })
     * //=> Thu Jun 15 2017 15:29:20
     */
    function add(dirtyDate, duration) {
      requiredArgs(2, arguments);
      if (!duration || typeof duration !== 'object') return new Date(NaN);
      var years = duration.years ? toInteger(duration.years) : 0;
      var months = duration.months ? toInteger(duration.months) : 0;
      var weeks = duration.weeks ? toInteger(duration.weeks) : 0;
      var days = duration.days ? toInteger(duration.days) : 0;
      var hours = duration.hours ? toInteger(duration.hours) : 0;
      var minutes = duration.minutes ? toInteger(duration.minutes) : 0;
      var seconds = duration.seconds ? toInteger(duration.seconds) : 0; // Add years and months

      var date = toDate(dirtyDate);
      var dateWithMonths = months || years ? addMonths(date, months + years * 12) : date; // Add weeks and days

      var dateWithDays = days || weeks ? addDays(dateWithMonths, days + weeks * 7) : dateWithMonths; // Add days, hours, minutes and seconds

      var minutesToAdd = minutes + hours * 60;
      var secondsToAdd = seconds + minutesToAdd * 60;
      var msToAdd = secondsToAdd * 1000;
      var finalDate = new Date(dateWithDays.getTime() + msToAdd);
      return finalDate;
    }

    /**
     * @name addMilliseconds
     * @category Millisecond Helpers
     * @summary Add the specified number of milliseconds to the given date.
     *
     * @description
     * Add the specified number of milliseconds to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
     * const result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:30.750
     */

    function addMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var timestamp = toDate(dirtyDate).getTime();
      var amount = toInteger(dirtyAmount);
      return new Date(timestamp + amount);
    }

    /**
     * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
     * They usually appear for dates that denote time before the timezones were introduced
     * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
     * and GMT+01:00:00 after that date)
     *
     * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
     * which would lead to incorrect calculations.
     *
     * This function returns the timezone offset in milliseconds that takes seconds in account.
     */
    function getTimezoneOffsetInMilliseconds(date) {
      var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
      utcDate.setUTCFullYear(date.getFullYear());
      return date.getTime() - utcDate.getTime();
    }

    /**
     * Days in 1 week.
     *
     * @name daysInWeek
     * @constant
     * @type {number}
     * @default
     */
    /**
     * Milliseconds in 1 minute
     *
     * @name millisecondsInMinute
     * @constant
     * @type {number}
     * @default
     */

    var millisecondsInMinute = 60000;
    /**
     * Milliseconds in 1 hour
     *
     * @name millisecondsInHour
     * @constant
     * @type {number}
     * @default
     */

    var millisecondsInHour = 3600000;

    /**
     * @name isDate
     * @category Common Helpers
     * @summary Is the given value a date?
     *
     * @description
     * Returns true if the given value is an instance of Date. The function works for dates transferred across iframes.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {*} value - the value to check
     * @returns {boolean} true if the given value is a date
     * @throws {TypeError} 1 arguments required
     *
     * @example
     * // For a valid date:
     * const result = isDate(new Date())
     * //=> true
     *
     * @example
     * // For an invalid date:
     * const result = isDate(new Date(NaN))
     * //=> true
     *
     * @example
     * // For some value:
     * const result = isDate('2014-02-31')
     * //=> false
     *
     * @example
     * // For an object:
     * const result = isDate({})
     * //=> false
     */

    function isDate(value) {
      requiredArgs(1, arguments);
      return value instanceof Date || typeof value === 'object' && Object.prototype.toString.call(value) === '[object Date]';
    }

    /**
     * @name isValid
     * @category Common Helpers
     * @summary Is the given date valid?
     *
     * @description
     * Returns false if argument is Invalid Date and true otherwise.
     * Argument is converted to Date using `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
     * Invalid Date is a Date, whose time value is NaN.
     *
     * Time value of Date: http://es5.github.io/#x15.9.1.1
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - Now `isValid` doesn't throw an exception
     *   if the first argument is not an instance of Date.
     *   Instead, argument is converted beforehand using `toDate`.
     *
     *   Examples:
     *
     *   | `isValid` argument        | Before v2.0.0 | v2.0.0 onward |
     *   |---------------------------|---------------|---------------|
     *   | `new Date()`              | `true`        | `true`        |
     *   | `new Date('2016-01-01')`  | `true`        | `true`        |
     *   | `new Date('')`            | `false`       | `false`       |
     *   | `new Date(1488370835081)` | `true`        | `true`        |
     *   | `new Date(NaN)`           | `false`       | `false`       |
     *   | `'2016-01-01'`            | `TypeError`   | `false`       |
     *   | `''`                      | `TypeError`   | `false`       |
     *   | `1488370835081`           | `TypeError`   | `true`        |
     *   | `NaN`                     | `TypeError`   | `false`       |
     *
     *   We introduce this change to make *date-fns* consistent with ECMAScript behavior
     *   that try to coerce arguments to the expected type
     *   (which is also the case with other *date-fns* functions).
     *
     * @param {*} date - the date to check
     * @returns {Boolean} the date is valid
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // For the valid date:
     * const result = isValid(new Date(2014, 1, 31))
     * //=> true
     *
     * @example
     * // For the value, convertable into a date:
     * const result = isValid(1393804800000)
     * //=> true
     *
     * @example
     * // For the invalid date:
     * const result = isValid(new Date(''))
     * //=> false
     */

    function isValid(dirtyDate) {
      requiredArgs(1, arguments);

      if (!isDate(dirtyDate) && typeof dirtyDate !== 'number') {
        return false;
      }

      var date = toDate(dirtyDate);
      return !isNaN(Number(date));
    }

    var formatDistanceLocale$1 = {
      lessThanXSeconds: {
        one: 'less than a second',
        other: 'less than {{count}} seconds'
      },
      xSeconds: {
        one: '1 second',
        other: '{{count}} seconds'
      },
      halfAMinute: 'half a minute',
      lessThanXMinutes: {
        one: 'less than a minute',
        other: 'less than {{count}} minutes'
      },
      xMinutes: {
        one: '1 minute',
        other: '{{count}} minutes'
      },
      aboutXHours: {
        one: 'about 1 hour',
        other: 'about {{count}} hours'
      },
      xHours: {
        one: '1 hour',
        other: '{{count}} hours'
      },
      xDays: {
        one: '1 day',
        other: '{{count}} days'
      },
      aboutXWeeks: {
        one: 'about 1 week',
        other: 'about {{count}} weeks'
      },
      xWeeks: {
        one: '1 week',
        other: '{{count}} weeks'
      },
      aboutXMonths: {
        one: 'about 1 month',
        other: 'about {{count}} months'
      },
      xMonths: {
        one: '1 month',
        other: '{{count}} months'
      },
      aboutXYears: {
        one: 'about 1 year',
        other: 'about {{count}} years'
      },
      xYears: {
        one: '1 year',
        other: '{{count}} years'
      },
      overXYears: {
        one: 'over 1 year',
        other: 'over {{count}} years'
      },
      almostXYears: {
        one: 'almost 1 year',
        other: 'almost {{count}} years'
      }
    };

    var formatDistance$2 = function (token, count, options) {
      var result;
      var tokenValue = formatDistanceLocale$1[token];

      if (typeof tokenValue === 'string') {
        result = tokenValue;
      } else if (count === 1) {
        result = tokenValue.one;
      } else {
        result = tokenValue.other.replace('{{count}}', count.toString());
      }

      if (options !== null && options !== void 0 && options.addSuffix) {
        if (options.comparison && options.comparison > 0) {
          return 'in ' + result;
        } else {
          return result + ' ago';
        }
      }

      return result;
    };

    var formatDistance$3 = formatDistance$2;

    function buildFormatLongFn(args) {
      return function () {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        // TODO: Remove String()
        var width = options.width ? String(options.width) : args.defaultWidth;
        var format = args.formats[width] || args.formats[args.defaultWidth];
        return format;
      };
    }

    var dateFormats$1 = {
      full: 'EEEE, MMMM do, y',
      long: 'MMMM do, y',
      medium: 'MMM d, y',
      short: 'MM/dd/yyyy'
    };
    var timeFormats$1 = {
      full: 'h:mm:ss a zzzz',
      long: 'h:mm:ss a z',
      medium: 'h:mm:ss a',
      short: 'h:mm a'
    };
    var dateTimeFormats$1 = {
      full: "{{date}} 'at' {{time}}",
      long: "{{date}} 'at' {{time}}",
      medium: '{{date}}, {{time}}',
      short: '{{date}}, {{time}}'
    };
    var formatLong$2 = {
      date: buildFormatLongFn({
        formats: dateFormats$1,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats$1,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats$1,
        defaultWidth: 'full'
      })
    };
    var formatLong$3 = formatLong$2;

    var formatRelativeLocale$1 = {
      lastWeek: "'last' eeee 'at' p",
      yesterday: "'yesterday at' p",
      today: "'today at' p",
      tomorrow: "'tomorrow at' p",
      nextWeek: "eeee 'at' p",
      other: 'P'
    };

    var formatRelative$2 = function (token, _date, _baseDate, _options) {
      return formatRelativeLocale$1[token];
    };

    var formatRelative$3 = formatRelative$2;

    function buildLocalizeFn(args) {
      return function (dirtyIndex, dirtyOptions) {
        var options = dirtyOptions || {};
        var context = options.context ? String(options.context) : 'standalone';
        var valuesArray;

        if (context === 'formatting' && args.formattingValues) {
          var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
          var width = options.width ? String(options.width) : defaultWidth;
          valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
        } else {
          var _defaultWidth = args.defaultWidth;

          var _width = options.width ? String(options.width) : args.defaultWidth;

          valuesArray = args.values[_width] || args.values[_defaultWidth];
        }

        var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex; // @ts-ignore: For some reason TypeScript just don't want to match it, no matter how hard we try. I challenge you to try to remove it!

        return valuesArray[index];
      };
    }

    var eraValues$1 = {
      narrow: ['B', 'A'],
      abbreviated: ['BC', 'AD'],
      wide: ['Before Christ', 'Anno Domini']
    };
    var quarterValues$1 = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
      wide: ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter']
    }; // Note: in English, the names of days of the week and months are capitalized.
    // If you are making a new locale based on this one, check if the same is true for the language you're working on.
    // Generally, formatted dates should look like they are in the middle of a sentence,
    // e.g. in Spanish language the weekdays and months should be in the lowercase.

    var monthValues$1 = {
      narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      wide: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    };
    var dayValues$1 = {
      narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      short: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      wide: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    var dayPeriodValues$1 = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      }
    };
    var formattingDayPeriodValues$1 = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      }
    };

    var ordinalNumber$1 = function (dirtyNumber, _options) {
      var number = Number(dirtyNumber); // If ordinal numbers depend on context, for example,
      // if they are different for different grammatical genders,
      // use `options.unit`.
      //
      // `unit` can be 'year', 'quarter', 'month', 'week', 'date', 'dayOfYear',
      // 'day', 'hour', 'minute', 'second'.

      var rem100 = number % 100;

      if (rem100 > 20 || rem100 < 10) {
        switch (rem100 % 10) {
          case 1:
            return number + 'st';

          case 2:
            return number + 'nd';

          case 3:
            return number + 'rd';
        }
      }

      return number + 'th';
    };

    var localize$2 = {
      ordinalNumber: ordinalNumber$1,
      era: buildLocalizeFn({
        values: eraValues$1,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues$1,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return quarter - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues$1,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues$1,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues$1,
        defaultWidth: 'wide',
        formattingValues: formattingDayPeriodValues$1,
        defaultFormattingWidth: 'wide'
      })
    };
    var localize$3 = localize$2;

    function buildMatchFn(args) {
      return function (string) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var width = options.width;
        var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
        var matchResult = string.match(matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
        var key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, function (pattern) {
          return pattern.test(matchedString);
        }) : findKey(parsePatterns, function (pattern) {
          return pattern.test(matchedString);
        });
        var value;
        value = args.valueCallback ? args.valueCallback(key) : key;
        value = options.valueCallback ? options.valueCallback(value) : value;
        var rest = string.slice(matchedString.length);
        return {
          value: value,
          rest: rest
        };
      };
    }

    function findKey(object, predicate) {
      for (var key in object) {
        if (object.hasOwnProperty(key) && predicate(object[key])) {
          return key;
        }
      }

      return undefined;
    }

    function findIndex(array, predicate) {
      for (var key = 0; key < array.length; key++) {
        if (predicate(array[key])) {
          return key;
        }
      }

      return undefined;
    }

    function buildMatchPatternFn(args) {
      return function (string) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var matchResult = string.match(args.matchPattern);
        if (!matchResult) return null;
        var matchedString = matchResult[0];
        var parseResult = string.match(args.parsePattern);
        if (!parseResult) return null;
        var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
        value = options.valueCallback ? options.valueCallback(value) : value;
        var rest = string.slice(matchedString.length);
        return {
          value: value,
          rest: rest
        };
      };
    }

    var matchOrdinalNumberPattern$1 = /^(\d+)(th|st|nd|rd)?/i;
    var parseOrdinalNumberPattern$1 = /\d+/i;
    var matchEraPatterns$1 = {
      narrow: /^(b|a)/i,
      abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
      wide: /^(before christ|before common era|anno domini|common era)/i
    };
    var parseEraPatterns$1 = {
      any: [/^b/i, /^(a|c)/i]
    };
    var matchQuarterPatterns$1 = {
      narrow: /^[1234]/i,
      abbreviated: /^q[1234]/i,
      wide: /^[1234](th|st|nd|rd)? quarter/i
    };
    var parseQuarterPatterns$1 = {
      any: [/1/i, /2/i, /3/i, /4/i]
    };
    var matchMonthPatterns$1 = {
      narrow: /^[jfmasond]/i,
      abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
    };
    var parseMonthPatterns$1 = {
      narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
      any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
    };
    var matchDayPatterns$1 = {
      narrow: /^[smtwf]/i,
      short: /^(su|mo|tu|we|th|fr|sa)/i,
      abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
      wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
    };
    var parseDayPatterns$1 = {
      narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
      any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
    };
    var matchDayPeriodPatterns$1 = {
      narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
      any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
    };
    var parseDayPeriodPatterns$1 = {
      any: {
        am: /^a/i,
        pm: /^p/i,
        midnight: /^mi/i,
        noon: /^no/i,
        morning: /morning/i,
        afternoon: /afternoon/i,
        evening: /evening/i,
        night: /night/i
      }
    };
    var match$2 = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern$1,
        parsePattern: parseOrdinalNumberPattern$1,
        valueCallback: function (value) {
          return parseInt(value, 10);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns$1,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns$1,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns$1,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns$1,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns$1,
        defaultMatchWidth: 'any',
        parsePatterns: parseDayPeriodPatterns$1,
        defaultParseWidth: 'any'
      })
    };
    var match$3 = match$2;

    /**
     * @type {Locale}
     * @category Locales
     * @summary English locale (United States).
     * @language English
     * @iso-639-2 eng
     * @author Sasha Koss [@kossnocorp]{@link https://github.com/kossnocorp}
     * @author Lesha Koss [@leshakoss]{@link https://github.com/leshakoss}
     */
    var locale$1 = {
      code: 'en-US',
      formatDistance: formatDistance$3,
      formatLong: formatLong$3,
      formatRelative: formatRelative$3,
      localize: localize$3,
      match: match$3,
      options: {
        weekStartsOn: 0
        /* Sunday */
        ,
        firstWeekContainsDate: 1
      }
    };
    var defaultLocale = locale$1;

    /**
     * @name subMilliseconds
     * @category Millisecond Helpers
     * @summary Subtract the specified number of milliseconds from the given date.
     *
     * @description
     * Subtract the specified number of milliseconds from the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds subtracted
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
     * const result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:29.250
     */

    function subMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var amount = toInteger(dirtyAmount);
      return addMilliseconds(dirtyDate, -amount);
    }

    var MILLISECONDS_IN_DAY = 86400000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCDayOfYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var timestamp = date.getTime();
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
      var startOfYearTimestamp = date.getTime();
      var difference = timestamp - startOfYearTimestamp;
      return Math.floor(difference / MILLISECONDS_IN_DAY) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var weekStartsOn = 1;
      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getUTCFullYear();
      var fourthOfJanuaryOfNextYear = new Date(0);
      fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
      fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
      var fourthOfJanuaryOfThisYear = new Date(0);
      fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
      fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var year = getUTCISOWeekYear(dirtyDate);
      var fourthOfJanuary = new Date(0);
      fourthOfJanuary.setUTCFullYear(year, 0, 4);
      fourthOfJanuary.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCISOWeek(fourthOfJanuary);
      return date;
    }

    var MILLISECONDS_IN_WEEK$1 = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK$1) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeek(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getUTCFullYear();
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var firstWeekOfNextYear = new Date(0);
      firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
      firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, dirtyOptions);
      var firstWeekOfThisYear = new Date(0);
      firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, dirtyOptions);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
      var year = getUTCWeekYear(dirtyDate, dirtyOptions);
      var firstWeek = new Date(0);
      firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeek.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCWeek(firstWeek, dirtyOptions);
      return date;
    }

    var MILLISECONDS_IN_WEEK = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeek(dirtyDate, options) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
    }

    function addLeadingZeros(number, targetLength) {
      var sign = number < 0 ? '-' : '';
      var output = Math.abs(number).toString();

      while (output.length < targetLength) {
        output = '0' + output;
      }

      return sign + output;
    }

    /*
     * |     | Unit                           |     | Unit                           |
     * |-----|--------------------------------|-----|--------------------------------|
     * |  a  | AM, PM                         |  A* |                                |
     * |  d  | Day of month                   |  D  |                                |
     * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
     * |  m  | Minute                         |  M  | Month                          |
     * |  s  | Second                         |  S  | Fraction of second             |
     * |  y  | Year (abs)                     |  Y  |                                |
     *
     * Letters marked by * are not implemented but reserved by Unicode standard.
     */

    var formatters$2 = {
      // Year
      y: function (date, token) {
        // From http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_tokens
        // | Year     |     y | yy |   yyy |  yyyy | yyyyy |
        // |----------|-------|----|-------|-------|-------|
        // | AD 1     |     1 | 01 |   001 |  0001 | 00001 |
        // | AD 12    |    12 | 12 |   012 |  0012 | 00012 |
        // | AD 123   |   123 | 23 |   123 |  0123 | 00123 |
        // | AD 1234  |  1234 | 34 |  1234 |  1234 | 01234 |
        // | AD 12345 | 12345 | 45 | 12345 | 12345 | 12345 |
        var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var year = signedYear > 0 ? signedYear : 1 - signedYear;
        return addLeadingZeros(token === 'yy' ? year % 100 : year, token.length);
      },
      // Month
      M: function (date, token) {
        var month = date.getUTCMonth();
        return token === 'M' ? String(month + 1) : addLeadingZeros(month + 1, 2);
      },
      // Day of the month
      d: function (date, token) {
        return addLeadingZeros(date.getUTCDate(), token.length);
      },
      // AM or PM
      a: function (date, token) {
        var dayPeriodEnumValue = date.getUTCHours() / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
            return dayPeriodEnumValue.toUpperCase();

          case 'aaa':
            return dayPeriodEnumValue;

          case 'aaaaa':
            return dayPeriodEnumValue[0];

          case 'aaaa':
          default:
            return dayPeriodEnumValue === 'am' ? 'a.m.' : 'p.m.';
        }
      },
      // Hour [1-12]
      h: function (date, token) {
        return addLeadingZeros(date.getUTCHours() % 12 || 12, token.length);
      },
      // Hour [0-23]
      H: function (date, token) {
        return addLeadingZeros(date.getUTCHours(), token.length);
      },
      // Minute
      m: function (date, token) {
        return addLeadingZeros(date.getUTCMinutes(), token.length);
      },
      // Second
      s: function (date, token) {
        return addLeadingZeros(date.getUTCSeconds(), token.length);
      },
      // Fraction of second
      S: function (date, token) {
        var numberOfDigits = token.length;
        var milliseconds = date.getUTCMilliseconds();
        var fractionalSeconds = Math.floor(milliseconds * Math.pow(10, numberOfDigits - 3));
        return addLeadingZeros(fractionalSeconds, token.length);
      }
    };
    var formatters$3 = formatters$2;

    var dayPeriodEnum = {
      am: 'am',
      pm: 'pm',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night'
    };
    /*
     * |     | Unit                           |     | Unit                           |
     * |-----|--------------------------------|-----|--------------------------------|
     * |  a  | AM, PM                         |  A* | Milliseconds in day            |
     * |  b  | AM, PM, noon, midnight         |  B  | Flexible day period            |
     * |  c  | Stand-alone local day of week  |  C* | Localized hour w/ day period   |
     * |  d  | Day of month                   |  D  | Day of year                    |
     * |  e  | Local day of week              |  E  | Day of week                    |
     * |  f  |                                |  F* | Day of week in month           |
     * |  g* | Modified Julian day            |  G  | Era                            |
     * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
     * |  i! | ISO day of week                |  I! | ISO week of year               |
     * |  j* | Localized hour w/ day period   |  J* | Localized hour w/o day period  |
     * |  k  | Hour [1-24]                    |  K  | Hour [0-11]                    |
     * |  l* | (deprecated)                   |  L  | Stand-alone month              |
     * |  m  | Minute                         |  M  | Month                          |
     * |  n  |                                |  N  |                                |
     * |  o! | Ordinal number modifier        |  O  | Timezone (GMT)                 |
     * |  p! | Long localized time            |  P! | Long localized date            |
     * |  q  | Stand-alone quarter            |  Q  | Quarter                        |
     * |  r* | Related Gregorian year         |  R! | ISO week-numbering year        |
     * |  s  | Second                         |  S  | Fraction of second             |
     * |  t! | Seconds timestamp              |  T! | Milliseconds timestamp         |
     * |  u  | Extended year                  |  U* | Cyclic year                    |
     * |  v* | Timezone (generic non-locat.)  |  V* | Timezone (location)            |
     * |  w  | Local week of year             |  W* | Week of month                  |
     * |  x  | Timezone (ISO-8601 w/o Z)      |  X  | Timezone (ISO-8601)            |
     * |  y  | Year (abs)                     |  Y  | Local week-numbering year      |
     * |  z  | Timezone (specific non-locat.) |  Z* | Timezone (aliases)             |
     *
     * Letters marked by * are not implemented but reserved by Unicode standard.
     *
     * Letters marked by ! are non-standard, but implemented by date-fns:
     * - `o` modifies the previous token to turn it into an ordinal (see `format` docs)
     * - `i` is ISO day of week. For `i` and `ii` is returns numeric ISO week days,
     *   i.e. 7 for Sunday, 1 for Monday, etc.
     * - `I` is ISO week of year, as opposed to `w` which is local week of year.
     * - `R` is ISO week-numbering year, as opposed to `Y` which is local week-numbering year.
     *   `R` is supposed to be used in conjunction with `I` and `i`
     *   for universal ISO week-numbering date, whereas
     *   `Y` is supposed to be used in conjunction with `w` and `e`
     *   for week-numbering date specific to the locale.
     * - `P` is long localized date format
     * - `p` is long localized time format
     */

    var formatters = {
      // Era
      G: function (date, token, localize) {
        var era = date.getUTCFullYear() > 0 ? 1 : 0;

        switch (token) {
          // AD, BC
          case 'G':
          case 'GG':
          case 'GGG':
            return localize.era(era, {
              width: 'abbreviated'
            });
          // A, B

          case 'GGGGG':
            return localize.era(era, {
              width: 'narrow'
            });
          // Anno Domini, Before Christ

          case 'GGGG':
          default:
            return localize.era(era, {
              width: 'wide'
            });
        }
      },
      // Year
      y: function (date, token, localize) {
        // Ordinal number
        if (token === 'yo') {
          var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

          var year = signedYear > 0 ? signedYear : 1 - signedYear;
          return localize.ordinalNumber(year, {
            unit: 'year'
          });
        }

        return formatters$3.y(date, token);
      },
      // Local week-numbering year
      Y: function (date, token, localize, options) {
        var signedWeekYear = getUTCWeekYear(date, options); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear; // Two digit year

        if (token === 'YY') {
          var twoDigitYear = weekYear % 100;
          return addLeadingZeros(twoDigitYear, 2);
        } // Ordinal number


        if (token === 'Yo') {
          return localize.ordinalNumber(weekYear, {
            unit: 'year'
          });
        } // Padding


        return addLeadingZeros(weekYear, token.length);
      },
      // ISO week-numbering year
      R: function (date, token) {
        var isoWeekYear = getUTCISOWeekYear(date); // Padding

        return addLeadingZeros(isoWeekYear, token.length);
      },
      // Extended year. This is a single number designating the year of this calendar system.
      // The main difference between `y` and `u` localizers are B.C. years:
      // | Year | `y` | `u` |
      // |------|-----|-----|
      // | AC 1 |   1 |   1 |
      // | BC 1 |   1 |   0 |
      // | BC 2 |   2 |  -1 |
      // Also `yy` always returns the last two digits of a year,
      // while `uu` pads single digit years to 2 characters and returns other years unchanged.
      u: function (date, token) {
        var year = date.getUTCFullYear();
        return addLeadingZeros(year, token.length);
      },
      // Quarter
      Q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'Q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'QQ':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'Qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'QQQ':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'QQQQQ':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'formatting'
            });
          // 1st quarter, 2nd quarter, ...

          case 'QQQQ':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone quarter
      q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'qq':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'qqq':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'qqqqq':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'standalone'
            });
          // 1st quarter, 2nd quarter, ...

          case 'qqqq':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Month
      M: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          case 'M':
          case 'MM':
            return formatters$3.M(date, token);
          // 1st, 2nd, ..., 12th

          case 'Mo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'MMM':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // J, F, ..., D

          case 'MMMMM':
            return localize.month(month, {
              width: 'narrow',
              context: 'formatting'
            });
          // January, February, ..., December

          case 'MMMM':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone month
      L: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          // 1, 2, ..., 12
          case 'L':
            return String(month + 1);
          // 01, 02, ..., 12

          case 'LL':
            return addLeadingZeros(month + 1, 2);
          // 1st, 2nd, ..., 12th

          case 'Lo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'LLL':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // J, F, ..., D

          case 'LLLLL':
            return localize.month(month, {
              width: 'narrow',
              context: 'standalone'
            });
          // January, February, ..., December

          case 'LLLL':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Local week of year
      w: function (date, token, localize, options) {
        var week = getUTCWeek(date, options);

        if (token === 'wo') {
          return localize.ordinalNumber(week, {
            unit: 'week'
          });
        }

        return addLeadingZeros(week, token.length);
      },
      // ISO week of year
      I: function (date, token, localize) {
        var isoWeek = getUTCISOWeek(date);

        if (token === 'Io') {
          return localize.ordinalNumber(isoWeek, {
            unit: 'week'
          });
        }

        return addLeadingZeros(isoWeek, token.length);
      },
      // Day of the month
      d: function (date, token, localize) {
        if (token === 'do') {
          return localize.ordinalNumber(date.getUTCDate(), {
            unit: 'date'
          });
        }

        return formatters$3.d(date, token);
      },
      // Day of year
      D: function (date, token, localize) {
        var dayOfYear = getUTCDayOfYear(date);

        if (token === 'Do') {
          return localize.ordinalNumber(dayOfYear, {
            unit: 'dayOfYear'
          });
        }

        return addLeadingZeros(dayOfYear, token.length);
      },
      // Day of week
      E: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();

        switch (token) {
          // Tue
          case 'E':
          case 'EE':
          case 'EEE':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'EEEEE':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'EEEEEE':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'EEEE':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Local day of week
      e: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (Nth day of week with current locale or weekStartsOn)
          case 'e':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'ee':
            return addLeadingZeros(localDayOfWeek, 2);
          // 1st, 2nd, ..., 7th

          case 'eo':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'eee':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'eeeee':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'eeeeee':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'eeee':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone local day of week
      c: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (same as in `e`)
          case 'c':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'cc':
            return addLeadingZeros(localDayOfWeek, token.length);
          // 1st, 2nd, ..., 7th

          case 'co':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'ccc':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // T

          case 'ccccc':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'standalone'
            });
          // Tu

          case 'cccccc':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'standalone'
            });
          // Tuesday

          case 'cccc':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // ISO day of week
      i: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();
        var isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        switch (token) {
          // 2
          case 'i':
            return String(isoDayOfWeek);
          // 02

          case 'ii':
            return addLeadingZeros(isoDayOfWeek, token.length);
          // 2nd

          case 'io':
            return localize.ordinalNumber(isoDayOfWeek, {
              unit: 'day'
            });
          // Tue

          case 'iii':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'iiiii':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'iiiiii':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'iiii':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM or PM
      a: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'aaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            }).toLowerCase();

          case 'aaaaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'aaaa':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM, PM, midnight, noon
      b: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours === 12) {
          dayPeriodEnumValue = dayPeriodEnum.noon;
        } else if (hours === 0) {
          dayPeriodEnumValue = dayPeriodEnum.midnight;
        } else {
          dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';
        }

        switch (token) {
          case 'b':
          case 'bb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'bbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            }).toLowerCase();

          case 'bbbbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'bbbb':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // in the morning, in the afternoon, in the evening, at night
      B: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours >= 17) {
          dayPeriodEnumValue = dayPeriodEnum.evening;
        } else if (hours >= 12) {
          dayPeriodEnumValue = dayPeriodEnum.afternoon;
        } else if (hours >= 4) {
          dayPeriodEnumValue = dayPeriodEnum.morning;
        } else {
          dayPeriodEnumValue = dayPeriodEnum.night;
        }

        switch (token) {
          case 'B':
          case 'BB':
          case 'BBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'BBBBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'BBBB':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Hour [1-12]
      h: function (date, token, localize) {
        if (token === 'ho') {
          var hours = date.getUTCHours() % 12;
          if (hours === 0) hours = 12;
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return formatters$3.h(date, token);
      },
      // Hour [0-23]
      H: function (date, token, localize) {
        if (token === 'Ho') {
          return localize.ordinalNumber(date.getUTCHours(), {
            unit: 'hour'
          });
        }

        return formatters$3.H(date, token);
      },
      // Hour [0-11]
      K: function (date, token, localize) {
        var hours = date.getUTCHours() % 12;

        if (token === 'Ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Hour [1-24]
      k: function (date, token, localize) {
        var hours = date.getUTCHours();
        if (hours === 0) hours = 24;

        if (token === 'ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Minute
      m: function (date, token, localize) {
        if (token === 'mo') {
          return localize.ordinalNumber(date.getUTCMinutes(), {
            unit: 'minute'
          });
        }

        return formatters$3.m(date, token);
      },
      // Second
      s: function (date, token, localize) {
        if (token === 'so') {
          return localize.ordinalNumber(date.getUTCSeconds(), {
            unit: 'second'
          });
        }

        return formatters$3.s(date, token);
      },
      // Fraction of second
      S: function (date, token) {
        return formatters$3.S(date, token);
      },
      // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
      X: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        if (timezoneOffset === 0) {
          return 'Z';
        }

        switch (token) {
          // Hours and optional minutes
          case 'X':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XX`

          case 'XXXX':
          case 'XX':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XXX`

          case 'XXXXX':
          case 'XXX': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
      x: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Hours and optional minutes
          case 'x':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xx`

          case 'xxxx':
          case 'xx':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xxx`

          case 'xxxxx':
          case 'xxx': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (GMT)
      O: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'O':
          case 'OO':
          case 'OOO':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'OOOO':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (specific non-location)
      z: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'z':
          case 'zz':
          case 'zzz':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'zzzz':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Seconds timestamp
      t: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = Math.floor(originalDate.getTime() / 1000);
        return addLeadingZeros(timestamp, token.length);
      },
      // Milliseconds timestamp
      T: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = originalDate.getTime();
        return addLeadingZeros(timestamp, token.length);
      }
    };

    function formatTimezoneShort(offset, dirtyDelimiter) {
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = Math.floor(absOffset / 60);
      var minutes = absOffset % 60;

      if (minutes === 0) {
        return sign + String(hours);
      }

      var delimiter = dirtyDelimiter || '';
      return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
    }

    function formatTimezoneWithOptionalMinutes(offset, dirtyDelimiter) {
      if (offset % 60 === 0) {
        var sign = offset > 0 ? '-' : '+';
        return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
      }

      return formatTimezone(offset, dirtyDelimiter);
    }

    function formatTimezone(offset, dirtyDelimiter) {
      var delimiter = dirtyDelimiter || '';
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = addLeadingZeros(Math.floor(absOffset / 60), 2);
      var minutes = addLeadingZeros(absOffset % 60, 2);
      return sign + hours + delimiter + minutes;
    }

    var formatters$1 = formatters;

    function dateLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'P':
          return formatLong.date({
            width: 'short'
          });

        case 'PP':
          return formatLong.date({
            width: 'medium'
          });

        case 'PPP':
          return formatLong.date({
            width: 'long'
          });

        case 'PPPP':
        default:
          return formatLong.date({
            width: 'full'
          });
      }
    }

    function timeLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'p':
          return formatLong.time({
            width: 'short'
          });

        case 'pp':
          return formatLong.time({
            width: 'medium'
          });

        case 'ppp':
          return formatLong.time({
            width: 'long'
          });

        case 'pppp':
        default:
          return formatLong.time({
            width: 'full'
          });
      }
    }

    function dateTimeLongFormatter(pattern, formatLong) {
      var matchResult = pattern.match(/(P+)(p+)?/) || [];
      var datePattern = matchResult[1];
      var timePattern = matchResult[2];

      if (!timePattern) {
        return dateLongFormatter(pattern, formatLong);
      }

      var dateTimeFormat;

      switch (datePattern) {
        case 'P':
          dateTimeFormat = formatLong.dateTime({
            width: 'short'
          });
          break;

        case 'PP':
          dateTimeFormat = formatLong.dateTime({
            width: 'medium'
          });
          break;

        case 'PPP':
          dateTimeFormat = formatLong.dateTime({
            width: 'long'
          });
          break;

        case 'PPPP':
        default:
          dateTimeFormat = formatLong.dateTime({
            width: 'full'
          });
          break;
      }

      return dateTimeFormat.replace('{{date}}', dateLongFormatter(datePattern, formatLong)).replace('{{time}}', timeLongFormatter(timePattern, formatLong));
    }

    var longFormatters = {
      p: timeLongFormatter,
      P: dateTimeLongFormatter
    };
    var longFormatters$1 = longFormatters;

    var protectedDayOfYearTokens = ['D', 'DD'];
    var protectedWeekYearTokens = ['YY', 'YYYY'];
    function isProtectedDayOfYearToken(token) {
      return protectedDayOfYearTokens.indexOf(token) !== -1;
    }
    function isProtectedWeekYearToken(token) {
      return protectedWeekYearTokens.indexOf(token) !== -1;
    }
    function throwProtectedError(token, format, input) {
      if (token === 'YYYY') {
        throw new RangeError("Use `yyyy` instead of `YYYY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'YY') {
        throw new RangeError("Use `yy` instead of `YY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'D') {
        throw new RangeError("Use `d` instead of `D` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'DD') {
        throw new RangeError("Use `dd` instead of `DD` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      }
    }

    // - [yYQqMLwIdDecihHKkms]o matches any available ordinal number token
    //   (one of the certain letters followed by `o`)
    // - (\w)\1* matches any sequences of the same letter
    // - '' matches two quote characters in a row
    // - '(''|[^'])+('|$) matches anything surrounded by two quote characters ('),
    //   except a single quote symbol, which ends the sequence.
    //   Two quote characters do not end the sequence.
    //   If there is no matching single quote
    //   then the sequence will continue until the end of the string.
    // - . matches any single character unmatched by previous parts of the RegExps

    var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g; // This RegExp catches symbols escaped by quotes, and also
    // sequences of symbols P, p, and the combinations like `PPPPPPPppppp`

    var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
    var escapedStringRegExp = /^'([^]*?)'?$/;
    var doubleQuoteRegExp = /''/g;
    var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
    /**
     * @name format
     * @category Common Helpers
     * @summary Format the date.
     *
     * @description
     * Return the formatted date string in the given format. The result may vary by locale.
     *
     * > ⚠️ Please note that the `format` tokens differ from Moment.js and other libraries.
     * > See: https://git.io/fxCyr
     *
     * The characters wrapped between two single quotes characters (') are escaped.
     * Two single quotes in a row, whether inside or outside a quoted sequence, represent a 'real' single quote.
     * (see the last example)
     *
     * Format of the string is based on Unicode Technical Standard #35:
     * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * with a few additions (see note 7 below the table).
     *
     * Accepted patterns:
     * | Unit                            | Pattern | Result examples                   | Notes |
     * |---------------------------------|---------|-----------------------------------|-------|
     * | Era                             | G..GGG  | AD, BC                            |       |
     * |                                 | GGGG    | Anno Domini, Before Christ        | 2     |
     * |                                 | GGGGG   | A, B                              |       |
     * | Calendar year                   | y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | yo      | 44th, 1st, 0th, 17th              | 5,7   |
     * |                                 | yy      | 44, 01, 00, 17                    | 5     |
     * |                                 | yyy     | 044, 001, 1900, 2017              | 5     |
     * |                                 | yyyy    | 0044, 0001, 1900, 2017            | 5     |
     * |                                 | yyyyy   | ...                               | 3,5   |
     * | Local week-numbering year       | Y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | Yo      | 44th, 1st, 1900th, 2017th         | 5,7   |
     * |                                 | YY      | 44, 01, 00, 17                    | 5,8   |
     * |                                 | YYY     | 044, 001, 1900, 2017              | 5     |
     * |                                 | YYYY    | 0044, 0001, 1900, 2017            | 5,8   |
     * |                                 | YYYYY   | ...                               | 3,5   |
     * | ISO week-numbering year         | R       | -43, 0, 1, 1900, 2017             | 5,7   |
     * |                                 | RR      | -43, 00, 01, 1900, 2017           | 5,7   |
     * |                                 | RRR     | -043, 000, 001, 1900, 2017        | 5,7   |
     * |                                 | RRRR    | -0043, 0000, 0001, 1900, 2017     | 5,7   |
     * |                                 | RRRRR   | ...                               | 3,5,7 |
     * | Extended year                   | u       | -43, 0, 1, 1900, 2017             | 5     |
     * |                                 | uu      | -43, 01, 1900, 2017               | 5     |
     * |                                 | uuu     | -043, 001, 1900, 2017             | 5     |
     * |                                 | uuuu    | -0043, 0001, 1900, 2017           | 5     |
     * |                                 | uuuuu   | ...                               | 3,5   |
     * | Quarter (formatting)            | Q       | 1, 2, 3, 4                        |       |
     * |                                 | Qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | QQ      | 01, 02, 03, 04                    |       |
     * |                                 | QQQ     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | QQQQ    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | QQQQQ   | 1, 2, 3, 4                        | 4     |
     * | Quarter (stand-alone)           | q       | 1, 2, 3, 4                        |       |
     * |                                 | qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | qq      | 01, 02, 03, 04                    |       |
     * |                                 | qqq     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | qqqq    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | qqqqq   | 1, 2, 3, 4                        | 4     |
     * | Month (formatting)              | M       | 1, 2, ..., 12                     |       |
     * |                                 | Mo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | MM      | 01, 02, ..., 12                   |       |
     * |                                 | MMM     | Jan, Feb, ..., Dec                |       |
     * |                                 | MMMM    | January, February, ..., December  | 2     |
     * |                                 | MMMMM   | J, F, ..., D                      |       |
     * | Month (stand-alone)             | L       | 1, 2, ..., 12                     |       |
     * |                                 | Lo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | LL      | 01, 02, ..., 12                   |       |
     * |                                 | LLL     | Jan, Feb, ..., Dec                |       |
     * |                                 | LLLL    | January, February, ..., December  | 2     |
     * |                                 | LLLLL   | J, F, ..., D                      |       |
     * | Local week of year              | w       | 1, 2, ..., 53                     |       |
     * |                                 | wo      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | ww      | 01, 02, ..., 53                   |       |
     * | ISO week of year                | I       | 1, 2, ..., 53                     | 7     |
     * |                                 | Io      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | II      | 01, 02, ..., 53                   | 7     |
     * | Day of month                    | d       | 1, 2, ..., 31                     |       |
     * |                                 | do      | 1st, 2nd, ..., 31st               | 7     |
     * |                                 | dd      | 01, 02, ..., 31                   |       |
     * | Day of year                     | D       | 1, 2, ..., 365, 366               | 9     |
     * |                                 | Do      | 1st, 2nd, ..., 365th, 366th       | 7     |
     * |                                 | DD      | 01, 02, ..., 365, 366             | 9     |
     * |                                 | DDD     | 001, 002, ..., 365, 366           |       |
     * |                                 | DDDD    | ...                               | 3     |
     * | Day of week (formatting)        | E..EEE  | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | EEEE    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | EEEEE   | M, T, W, T, F, S, S               |       |
     * |                                 | EEEEEE  | Mo, Tu, We, Th, Fr, Sa, Su        |       |
     * | ISO day of week (formatting)    | i       | 1, 2, 3, ..., 7                   | 7     |
     * |                                 | io      | 1st, 2nd, ..., 7th                | 7     |
     * |                                 | ii      | 01, 02, ..., 07                   | 7     |
     * |                                 | iii     | Mon, Tue, Wed, ..., Sun           | 7     |
     * |                                 | iiii    | Monday, Tuesday, ..., Sunday      | 2,7   |
     * |                                 | iiiii   | M, T, W, T, F, S, S               | 7     |
     * |                                 | iiiiii  | Mo, Tu, We, Th, Fr, Sa, Su        | 7     |
     * | Local day of week (formatting)  | e       | 2, 3, 4, ..., 1                   |       |
     * |                                 | eo      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | ee      | 02, 03, ..., 01                   |       |
     * |                                 | eee     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | eeee    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | eeeee   | M, T, W, T, F, S, S               |       |
     * |                                 | eeeeee  | Mo, Tu, We, Th, Fr, Sa, Su        |       |
     * | Local day of week (stand-alone) | c       | 2, 3, 4, ..., 1                   |       |
     * |                                 | co      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | cc      | 02, 03, ..., 01                   |       |
     * |                                 | ccc     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | cccc    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | ccccc   | M, T, W, T, F, S, S               |       |
     * |                                 | cccccc  | Mo, Tu, We, Th, Fr, Sa, Su        |       |
     * | AM, PM                          | a..aa   | AM, PM                            |       |
     * |                                 | aaa     | am, pm                            |       |
     * |                                 | aaaa    | a.m., p.m.                        | 2     |
     * |                                 | aaaaa   | a, p                              |       |
     * | AM, PM, noon, midnight          | b..bb   | AM, PM, noon, midnight            |       |
     * |                                 | bbb     | am, pm, noon, midnight            |       |
     * |                                 | bbbb    | a.m., p.m., noon, midnight        | 2     |
     * |                                 | bbbbb   | a, p, n, mi                       |       |
     * | Flexible day period             | B..BBB  | at night, in the morning, ...     |       |
     * |                                 | BBBB    | at night, in the morning, ...     | 2     |
     * |                                 | BBBBB   | at night, in the morning, ...     |       |
     * | Hour [1-12]                     | h       | 1, 2, ..., 11, 12                 |       |
     * |                                 | ho      | 1st, 2nd, ..., 11th, 12th         | 7     |
     * |                                 | hh      | 01, 02, ..., 11, 12               |       |
     * | Hour [0-23]                     | H       | 0, 1, 2, ..., 23                  |       |
     * |                                 | Ho      | 0th, 1st, 2nd, ..., 23rd          | 7     |
     * |                                 | HH      | 00, 01, 02, ..., 23               |       |
     * | Hour [0-11]                     | K       | 1, 2, ..., 11, 0                  |       |
     * |                                 | Ko      | 1st, 2nd, ..., 11th, 0th          | 7     |
     * |                                 | KK      | 01, 02, ..., 11, 00               |       |
     * | Hour [1-24]                     | k       | 24, 1, 2, ..., 23                 |       |
     * |                                 | ko      | 24th, 1st, 2nd, ..., 23rd         | 7     |
     * |                                 | kk      | 24, 01, 02, ..., 23               |       |
     * | Minute                          | m       | 0, 1, ..., 59                     |       |
     * |                                 | mo      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | mm      | 00, 01, ..., 59                   |       |
     * | Second                          | s       | 0, 1, ..., 59                     |       |
     * |                                 | so      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | ss      | 00, 01, ..., 59                   |       |
     * | Fraction of second              | S       | 0, 1, ..., 9                      |       |
     * |                                 | SS      | 00, 01, ..., 99                   |       |
     * |                                 | SSS     | 000, 001, ..., 999                |       |
     * |                                 | SSSS    | ...                               | 3     |
     * | Timezone (ISO-8601 w/ Z)        | X       | -08, +0530, Z                     |       |
     * |                                 | XX      | -0800, +0530, Z                   |       |
     * |                                 | XXX     | -08:00, +05:30, Z                 |       |
     * |                                 | XXXX    | -0800, +0530, Z, +123456          | 2     |
     * |                                 | XXXXX   | -08:00, +05:30, Z, +12:34:56      |       |
     * | Timezone (ISO-8601 w/o Z)       | x       | -08, +0530, +00                   |       |
     * |                                 | xx      | -0800, +0530, +0000               |       |
     * |                                 | xxx     | -08:00, +05:30, +00:00            | 2     |
     * |                                 | xxxx    | -0800, +0530, +0000, +123456      |       |
     * |                                 | xxxxx   | -08:00, +05:30, +00:00, +12:34:56 |       |
     * | Timezone (GMT)                  | O...OOO | GMT-8, GMT+5:30, GMT+0            |       |
     * |                                 | OOOO    | GMT-08:00, GMT+05:30, GMT+00:00   | 2     |
     * | Timezone (specific non-locat.)  | z...zzz | GMT-8, GMT+5:30, GMT+0            | 6     |
     * |                                 | zzzz    | GMT-08:00, GMT+05:30, GMT+00:00   | 2,6   |
     * | Seconds timestamp               | t       | 512969520                         | 7     |
     * |                                 | tt      | ...                               | 3,7   |
     * | Milliseconds timestamp          | T       | 512969520900                      | 7     |
     * |                                 | TT      | ...                               | 3,7   |
     * | Long localized date             | P       | 04/29/1453                        | 7     |
     * |                                 | PP      | Apr 29, 1453                      | 7     |
     * |                                 | PPP     | April 29th, 1453                  | 7     |
     * |                                 | PPPP    | Friday, April 29th, 1453          | 2,7   |
     * | Long localized time             | p       | 12:00 AM                          | 7     |
     * |                                 | pp      | 12:00:00 AM                       | 7     |
     * |                                 | ppp     | 12:00:00 AM GMT+2                 | 7     |
     * |                                 | pppp    | 12:00:00 AM GMT+02:00             | 2,7   |
     * | Combination of date and time    | Pp      | 04/29/1453, 12:00 AM              | 7     |
     * |                                 | PPpp    | Apr 29, 1453, 12:00:00 AM         | 7     |
     * |                                 | PPPppp  | April 29th, 1453 at ...           | 7     |
     * |                                 | PPPPpppp| Friday, April 29th, 1453 at ...   | 2,7   |
     * Notes:
     * 1. "Formatting" units (e.g. formatting quarter) in the default en-US locale
     *    are the same as "stand-alone" units, but are different in some languages.
     *    "Formatting" units are declined according to the rules of the language
     *    in the context of a date. "Stand-alone" units are always nominative singular:
     *
     *    `format(new Date(2017, 10, 6), 'do LLLL', {locale: cs}) //=> '6. listopad'`
     *
     *    `format(new Date(2017, 10, 6), 'do MMMM', {locale: cs}) //=> '6. listopadu'`
     *
     * 2. Any sequence of the identical letters is a pattern, unless it is escaped by
     *    the single quote characters (see below).
     *    If the sequence is longer than listed in table (e.g. `EEEEEEEEEEE`)
     *    the output will be the same as default pattern for this unit, usually
     *    the longest one (in case of ISO weekdays, `EEEE`). Default patterns for units
     *    are marked with "2" in the last column of the table.
     *
     *    `format(new Date(2017, 10, 6), 'MMM') //=> 'Nov'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMM') //=> 'N'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMMM') //=> 'November'`
     *
     * 3. Some patterns could be unlimited length (such as `yyyyyyyy`).
     *    The output will be padded with zeros to match the length of the pattern.
     *
     *    `format(new Date(2017, 10, 6), 'yyyyyyyy') //=> '00002017'`
     *
     * 4. `QQQQQ` and `qqqqq` could be not strictly numerical in some locales.
     *    These tokens represent the shortest form of the quarter.
     *
     * 5. The main difference between `y` and `u` patterns are B.C. years:
     *
     *    | Year | `y` | `u` |
     *    |------|-----|-----|
     *    | AC 1 |   1 |   1 |
     *    | BC 1 |   1 |   0 |
     *    | BC 2 |   2 |  -1 |
     *
     *    Also `yy` always returns the last two digits of a year,
     *    while `uu` pads single digit years to 2 characters and returns other years unchanged:
     *
     *    | Year | `yy` | `uu` |
     *    |------|------|------|
     *    | 1    |   01 |   01 |
     *    | 14   |   14 |   14 |
     *    | 376  |   76 |  376 |
     *    | 1453 |   53 | 1453 |
     *
     *    The same difference is true for local and ISO week-numbering years (`Y` and `R`),
     *    except local week-numbering years are dependent on `options.weekStartsOn`
     *    and `options.firstWeekContainsDate` (compare [getISOWeekYear]{@link https://date-fns.org/docs/getISOWeekYear}
     *    and [getWeekYear]{@link https://date-fns.org/docs/getWeekYear}).
     *
     * 6. Specific non-location timezones are currently unavailable in `date-fns`,
     *    so right now these tokens fall back to GMT timezones.
     *
     * 7. These patterns are not in the Unicode Technical Standard #35:
     *    - `i`: ISO day of week
     *    - `I`: ISO week of year
     *    - `R`: ISO week-numbering year
     *    - `t`: seconds timestamp
     *    - `T`: milliseconds timestamp
     *    - `o`: ordinal number modifier
     *    - `P`: long localized date
     *    - `p`: long localized time
     *
     * 8. `YY` and `YYYY` tokens represent week-numbering years but they are often confused with years.
     *    You should enable `options.useAdditionalWeekYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 9. `D` and `DD` tokens represent days of the year but they are often confused with days of the month.
     *    You should enable `options.useAdditionalDayOfYearTokens` to use them. See: https://git.io/fxCyr
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - The second argument is now required for the sake of explicitness.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   format(new Date(2016, 0, 1))
     *
     *   // v2.0.0 onward
     *   format(new Date(2016, 0, 1), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
     *   ```
     *
     * - New format string API for `format` function
     *   which is based on [Unicode Technical Standard #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table).
     *   See [this post](https://blog.date-fns.org/post/unicode-tokens-in-date-fns-v2-sreatyki91jg) for more details.
     *
     * - Characters are now escaped using single quote symbols (`'`) instead of square brackets.
     *
     * @param {Date|Number} date - the original date
     * @param {String} format - the string of tokens
     * @param {Object} [options] - an object with options.
     * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
     * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
     * @param {Number} [options.firstWeekContainsDate=1] - the day of January, which is
     * @param {Boolean} [options.useAdditionalWeekYearTokens=false] - if true, allows usage of the week-numbering year tokens `YY` and `YYYY`;
     *   see: https://git.io/fxCyr
     * @param {Boolean} [options.useAdditionalDayOfYearTokens=false] - if true, allows usage of the day of year tokens `D` and `DD`;
     *   see: https://git.io/fxCyr
     * @returns {String} the formatted date string
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `date` must not be Invalid Date
     * @throws {RangeError} `options.locale` must contain `localize` property
     * @throws {RangeError} `options.locale` must contain `formatLong` property
     * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
     * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7
     * @throws {RangeError} use `yyyy` instead of `YYYY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `yy` instead of `YY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `d` instead of `D` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `dd` instead of `DD` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} format string contains an unescaped latin alphabet character
     *
     * @example
     * // Represent 11 February 2014 in middle-endian format:
     * var result = format(new Date(2014, 1, 11), 'MM/dd/yyyy')
     * //=> '02/11/2014'
     *
     * @example
     * // Represent 2 July 2014 in Esperanto:
     * import { eoLocale } from 'date-fns/locale/eo'
     * var result = format(new Date(2014, 6, 2), "do 'de' MMMM yyyy", {
     *   locale: eoLocale
     * })
     * //=> '2-a de julio 2014'
     *
     * @example
     * // Escape string by single quote characters:
     * var result = format(new Date(2014, 6, 2, 15), "h 'o''clock'")
     * //=> "3 o'clock"
     */

    function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
      requiredArgs(2, arguments);
      var formatStr = String(dirtyFormatStr);
      var options = dirtyOptions || {};
      var locale = options.locale || defaultLocale;
      var localeFirstWeekContainsDate = locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var localeWeekStartsOn = locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      if (!locale.localize) {
        throw new RangeError('locale must contain localize property');
      }

      if (!locale.formatLong) {
        throw new RangeError('locale must contain formatLong property');
      }

      var originalDate = toDate(dirtyDate);

      if (!isValid(originalDate)) {
        throw new RangeError('Invalid time value');
      } // Convert the date in system timezone to the same date in UTC+00:00 timezone.
      // This ensures that when UTC functions will be implemented, locales will be compatible with them.
      // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/376


      var timezoneOffset = getTimezoneOffsetInMilliseconds(originalDate);
      var utcDate = subMilliseconds(originalDate, timezoneOffset);
      var formatterOptions = {
        firstWeekContainsDate: firstWeekContainsDate,
        weekStartsOn: weekStartsOn,
        locale: locale,
        _originalDate: originalDate
      };
      var result = formatStr.match(longFormattingTokensRegExp).map(function (substring) {
        var firstCharacter = substring[0];

        if (firstCharacter === 'p' || firstCharacter === 'P') {
          var longFormatter = longFormatters$1[firstCharacter];
          return longFormatter(substring, locale.formatLong, formatterOptions);
        }

        return substring;
      }).join('').match(formattingTokensRegExp).map(function (substring) {
        // Replace two single quote characters with one single quote character
        if (substring === "''") {
          return "'";
        }

        var firstCharacter = substring[0];

        if (firstCharacter === "'") {
          return cleanEscapedString(substring);
        }

        var formatter = formatters$1[firstCharacter];

        if (formatter) {
          if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(substring)) {
            throwProtectedError(substring, dirtyFormatStr, dirtyDate);
          }

          if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(substring)) {
            throwProtectedError(substring, dirtyFormatStr, dirtyDate);
          }

          return formatter(utcDate, substring, locale.localize, formatterOptions);
        }

        if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
          throw new RangeError('Format string contains an unescaped latin alphabet character `' + firstCharacter + '`');
        }

        return substring;
      }).join('');
      return result;
    }

    function cleanEscapedString(input) {
      return input.match(escapedStringRegExp)[1].replace(doubleQuoteRegExp, "'");
    }

    /**
     * @name parseISO
     * @category Common Helpers
     * @summary Parse ISO string
     *
     * @description
     * Parse the given string in ISO 8601 format and return an instance of Date.
     *
     * Function accepts complete ISO 8601 formats as well as partial implementations.
     * ISO 8601: http://en.wikipedia.org/wiki/ISO_8601
     *
     * If the argument isn't a string, the function cannot parse the string or
     * the values are invalid, it returns Invalid Date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - The previous `parse` implementation was renamed to `parseISO`.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   parse('2016-01-01')
     *
     *   // v2.0.0 onward
     *   parseISO('2016-01-01')
     *   ```
     *
     * - `parseISO` now validates separate date and time values in ISO-8601 strings
     *   and returns `Invalid Date` if the date is invalid.
     *
     *   ```javascript
     *   parseISO('2018-13-32')
     *   //=> Invalid Date
     *   ```
     *
     * - `parseISO` now doesn't fall back to `new Date` constructor
     *   if it fails to parse a string argument. Instead, it returns `Invalid Date`.
     *
     * @param {String} argument - the value to convert
     * @param {Object} [options] - an object with options.
     * @param {0|1|2} [options.additionalDigits=2] - the additional number of digits in the extended year format
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
     *
     * @example
     * // Convert string '2014-02-11T11:30:30' to date:
     * const result = parseISO('2014-02-11T11:30:30')
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert string '+02014101' to date,
     * // if the additional number of digits in the extended year format is 1:
     * const result = parseISO('+02014101', { additionalDigits: 1 })
     * //=> Fri Apr 11 2014 00:00:00
     */

    function parseISO(argument, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var additionalDigits = options.additionalDigits == null ? 2 : toInteger(options.additionalDigits);

      if (additionalDigits !== 2 && additionalDigits !== 1 && additionalDigits !== 0) {
        throw new RangeError('additionalDigits must be 0, 1 or 2');
      }

      if (!(typeof argument === 'string' || Object.prototype.toString.call(argument) === '[object String]')) {
        return new Date(NaN);
      }

      var dateStrings = splitDateString(argument);
      var date;

      if (dateStrings.date) {
        var parseYearResult = parseYear(dateStrings.date, additionalDigits);
        date = parseDate(parseYearResult.restDateString, parseYearResult.year);
      }

      if (!date || isNaN(date.getTime())) {
        return new Date(NaN);
      }

      var timestamp = date.getTime();
      var time = 0;
      var offset;

      if (dateStrings.time) {
        time = parseTime(dateStrings.time);

        if (isNaN(time)) {
          return new Date(NaN);
        }
      }

      if (dateStrings.timezone) {
        offset = parseTimezone(dateStrings.timezone);

        if (isNaN(offset)) {
          return new Date(NaN);
        }
      } else {
        var dirtyDate = new Date(timestamp + time); // js parsed string assuming it's in UTC timezone
        // but we need it to be parsed in our timezone
        // so we use utc values to build date in our timezone.
        // Year values from 0 to 99 map to the years 1900 to 1999
        // so set year explicitly with setFullYear.

        var result = new Date(0);
        result.setFullYear(dirtyDate.getUTCFullYear(), dirtyDate.getUTCMonth(), dirtyDate.getUTCDate());
        result.setHours(dirtyDate.getUTCHours(), dirtyDate.getUTCMinutes(), dirtyDate.getUTCSeconds(), dirtyDate.getUTCMilliseconds());
        return result;
      }

      return new Date(timestamp + time + offset);
    }
    var patterns = {
      dateTimeDelimiter: /[T ]/,
      timeZoneDelimiter: /[Z ]/i,
      timezone: /([Z+-].*)$/
    };
    var dateRegex = /^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/;
    var timeRegex = /^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/;
    var timezoneRegex = /^([+-])(\d{2})(?::?(\d{2}))?$/;

    function splitDateString(dateString) {
      var dateStrings = {};
      var array = dateString.split(patterns.dateTimeDelimiter);
      var timeString; // The regex match should only return at maximum two array elements.
      // [date], [time], or [date, time].

      if (array.length > 2) {
        return dateStrings;
      }

      if (/:/.test(array[0])) {
        timeString = array[0];
      } else {
        dateStrings.date = array[0];
        timeString = array[1];

        if (patterns.timeZoneDelimiter.test(dateStrings.date)) {
          dateStrings.date = dateString.split(patterns.timeZoneDelimiter)[0];
          timeString = dateString.substr(dateStrings.date.length, dateString.length);
        }
      }

      if (timeString) {
        var token = patterns.timezone.exec(timeString);

        if (token) {
          dateStrings.time = timeString.replace(token[1], '');
          dateStrings.timezone = token[1];
        } else {
          dateStrings.time = timeString;
        }
      }

      return dateStrings;
    }

    function parseYear(dateString, additionalDigits) {
      var regex = new RegExp('^(?:(\\d{4}|[+-]\\d{' + (4 + additionalDigits) + '})|(\\d{2}|[+-]\\d{' + (2 + additionalDigits) + '})$)');
      var captures = dateString.match(regex); // Invalid ISO-formatted year

      if (!captures) return {
        year: NaN,
        restDateString: ''
      };
      var year = captures[1] ? parseInt(captures[1]) : null;
      var century = captures[2] ? parseInt(captures[2]) : null; // either year or century is null, not both

      return {
        year: century === null ? year : century * 100,
        restDateString: dateString.slice((captures[1] || captures[2]).length)
      };
    }

    function parseDate(dateString, year) {
      // Invalid ISO-formatted year
      if (year === null) return new Date(NaN);
      var captures = dateString.match(dateRegex); // Invalid ISO-formatted string

      if (!captures) return new Date(NaN);
      var isWeekDate = !!captures[4];
      var dayOfYear = parseDateUnit(captures[1]);
      var month = parseDateUnit(captures[2]) - 1;
      var day = parseDateUnit(captures[3]);
      var week = parseDateUnit(captures[4]);
      var dayOfWeek = parseDateUnit(captures[5]) - 1;

      if (isWeekDate) {
        if (!validateWeekDate(year, week, dayOfWeek)) {
          return new Date(NaN);
        }

        return dayOfISOWeekYear(year, week, dayOfWeek);
      } else {
        var date = new Date(0);

        if (!validateDate(year, month, day) || !validateDayOfYearDate(year, dayOfYear)) {
          return new Date(NaN);
        }

        date.setUTCFullYear(year, month, Math.max(dayOfYear, day));
        return date;
      }
    }

    function parseDateUnit(value) {
      return value ? parseInt(value) : 1;
    }

    function parseTime(timeString) {
      var captures = timeString.match(timeRegex);
      if (!captures) return NaN; // Invalid ISO-formatted time

      var hours = parseTimeUnit(captures[1]);
      var minutes = parseTimeUnit(captures[2]);
      var seconds = parseTimeUnit(captures[3]);

      if (!validateTime(hours, minutes, seconds)) {
        return NaN;
      }

      return hours * millisecondsInHour + minutes * millisecondsInMinute + seconds * 1000;
    }

    function parseTimeUnit(value) {
      return value && parseFloat(value.replace(',', '.')) || 0;
    }

    function parseTimezone(timezoneString) {
      if (timezoneString === 'Z') return 0;
      var captures = timezoneString.match(timezoneRegex);
      if (!captures) return 0;
      var sign = captures[1] === '+' ? -1 : 1;
      var hours = parseInt(captures[2]);
      var minutes = captures[3] && parseInt(captures[3]) || 0;

      if (!validateTimezone(hours, minutes)) {
        return NaN;
      }

      return sign * (hours * millisecondsInHour + minutes * millisecondsInMinute);
    }

    function dayOfISOWeekYear(isoWeekYear, week, day) {
      var date = new Date(0);
      date.setUTCFullYear(isoWeekYear, 0, 4);
      var fourthOfJanuaryDay = date.getUTCDay() || 7;
      var diff = (week - 1) * 7 + day + 1 - fourthOfJanuaryDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
    } // Validation functions
    // February is null to handle the leap year (using ||)


    var daysInMonths = [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    function isLeapYearIndex(year) {
      return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
    }

    function validateDate(year, month, date) {
      return month >= 0 && month <= 11 && date >= 1 && date <= (daysInMonths[month] || (isLeapYearIndex(year) ? 29 : 28));
    }

    function validateDayOfYearDate(year, dayOfYear) {
      return dayOfYear >= 1 && dayOfYear <= (isLeapYearIndex(year) ? 366 : 365);
    }

    function validateWeekDate(_year, week, day) {
      return week >= 1 && week <= 53 && day >= 0 && day <= 6;
    }

    function validateTime(hours, minutes, seconds) {
      if (hours === 24) {
        return minutes === 0 && seconds === 0;
      }

      return seconds >= 0 && seconds < 60 && minutes >= 0 && minutes < 60 && hours >= 0 && hours < 25;
    }

    function validateTimezone(_hours, minutes) {
      return minutes >= 0 && minutes <= 59;
    }

    var formatDistanceLocale = {
      lessThanXSeconds: {
        standalone: {
          one: 'weniger als 1 Sekunde',
          other: 'weniger als {{count}} Sekunden'
        },
        withPreposition: {
          one: 'weniger als 1 Sekunde',
          other: 'weniger als {{count}} Sekunden'
        }
      },
      xSeconds: {
        standalone: {
          one: '1 Sekunde',
          other: '{{count}} Sekunden'
        },
        withPreposition: {
          one: '1 Sekunde',
          other: '{{count}} Sekunden'
        }
      },
      halfAMinute: {
        standalone: 'halbe Minute',
        withPreposition: 'halben Minute'
      },
      lessThanXMinutes: {
        standalone: {
          one: 'weniger als 1 Minute',
          other: 'weniger als {{count}} Minuten'
        },
        withPreposition: {
          one: 'weniger als 1 Minute',
          other: 'weniger als {{count}} Minuten'
        }
      },
      xMinutes: {
        standalone: {
          one: '1 Minute',
          other: '{{count}} Minuten'
        },
        withPreposition: {
          one: '1 Minute',
          other: '{{count}} Minuten'
        }
      },
      aboutXHours: {
        standalone: {
          one: 'etwa 1 Stunde',
          other: 'etwa {{count}} Stunden'
        },
        withPreposition: {
          one: 'etwa 1 Stunde',
          other: 'etwa {{count}} Stunden'
        }
      },
      xHours: {
        standalone: {
          one: '1 Stunde',
          other: '{{count}} Stunden'
        },
        withPreposition: {
          one: '1 Stunde',
          other: '{{count}} Stunden'
        }
      },
      xDays: {
        standalone: {
          one: '1 Tag',
          other: '{{count}} Tage'
        },
        withPreposition: {
          one: '1 Tag',
          other: '{{count}} Tagen'
        }
      },
      aboutXWeeks: {
        standalone: {
          one: 'etwa 1 Woche',
          other: 'etwa {{count}} Wochen'
        },
        withPreposition: {
          one: 'etwa 1 Woche',
          other: 'etwa {{count}} Wochen'
        }
      },
      xWeeks: {
        standalone: {
          one: '1 Woche',
          other: '{{count}} Wochen'
        },
        withPreposition: {
          one: '1 Woche',
          other: '{{count}} Wochen'
        }
      },
      aboutXMonths: {
        standalone: {
          one: 'etwa 1 Monat',
          other: 'etwa {{count}} Monate'
        },
        withPreposition: {
          one: 'etwa 1 Monat',
          other: 'etwa {{count}} Monaten'
        }
      },
      xMonths: {
        standalone: {
          one: '1 Monat',
          other: '{{count}} Monate'
        },
        withPreposition: {
          one: '1 Monat',
          other: '{{count}} Monaten'
        }
      },
      aboutXYears: {
        standalone: {
          one: 'etwa 1 Jahr',
          other: 'etwa {{count}} Jahre'
        },
        withPreposition: {
          one: 'etwa 1 Jahr',
          other: 'etwa {{count}} Jahren'
        }
      },
      xYears: {
        standalone: {
          one: '1 Jahr',
          other: '{{count}} Jahre'
        },
        withPreposition: {
          one: '1 Jahr',
          other: '{{count}} Jahren'
        }
      },
      overXYears: {
        standalone: {
          one: 'mehr als 1 Jahr',
          other: 'mehr als {{count}} Jahre'
        },
        withPreposition: {
          one: 'mehr als 1 Jahr',
          other: 'mehr als {{count}} Jahren'
        }
      },
      almostXYears: {
        standalone: {
          one: 'fast 1 Jahr',
          other: 'fast {{count}} Jahre'
        },
        withPreposition: {
          one: 'fast 1 Jahr',
          other: 'fast {{count}} Jahren'
        }
      }
    };

    var formatDistance = function (token, count, options) {
      var result;
      var tokenValue = options !== null && options !== void 0 && options.addSuffix ? formatDistanceLocale[token].withPreposition : formatDistanceLocale[token].standalone;

      if (typeof tokenValue === 'string') {
        result = tokenValue;
      } else if (count === 1) {
        result = tokenValue.one;
      } else {
        result = tokenValue.other.replace('{{count}}', String(count));
      }

      if (options !== null && options !== void 0 && options.addSuffix) {
        if (options.comparison && options.comparison > 0) {
          return 'in ' + result;
        } else {
          return 'vor ' + result;
        }
      }

      return result;
    };

    var formatDistance$1 = formatDistance;

    // DIN 5008: https://de.wikipedia.org/wiki/Datumsformat#DIN_5008
    var dateFormats = {
      full: 'EEEE, do MMMM y',
      // Montag, 7. Januar 2018
      long: 'do MMMM y',
      // 7. Januar 2018
      medium: 'do MMM y',
      // 7. Jan. 2018
      short: 'dd.MM.y' // 07.01.2018

    };
    var timeFormats = {
      full: 'HH:mm:ss zzzz',
      long: 'HH:mm:ss z',
      medium: 'HH:mm:ss',
      short: 'HH:mm'
    };
    var dateTimeFormats = {
      full: "{{date}} 'um' {{time}}",
      long: "{{date}} 'um' {{time}}",
      medium: '{{date}} {{time}}',
      short: '{{date}} {{time}}'
    };
    var formatLong = {
      date: buildFormatLongFn({
        formats: dateFormats,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats,
        defaultWidth: 'full'
      })
    };
    var formatLong$1 = formatLong;

    var formatRelativeLocale = {
      lastWeek: "'letzten' eeee 'um' p",
      yesterday: "'gestern um' p",
      today: "'heute um' p",
      tomorrow: "'morgen um' p",
      nextWeek: "eeee 'um' p",
      other: 'P'
    };

    var formatRelative = function (token, _date, _baseDate, _options) {
      return formatRelativeLocale[token];
    };

    var formatRelative$1 = formatRelative;

    var eraValues = {
      narrow: ['v.Chr.', 'n.Chr.'],
      abbreviated: ['v.Chr.', 'n.Chr.'],
      wide: ['vor Christus', 'nach Christus']
    };
    var quarterValues = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
      wide: ['1. Quartal', '2. Quartal', '3. Quartal', '4. Quartal']
    }; // Note: in German, the names of days of the week and months are capitalized.
    // If you are making a new locale based on this one, check if the same is true for the language you're working on.
    // Generally, formatted dates should look like they are in the middle of a sentence,
    // e.g. in Spanish language the weekdays and months should be in the lowercase.

    var monthValues = {
      narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      abbreviated: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
      wide: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    }; // https://st.unicode.org/cldr-apps/v#/de/Gregorian/

    var formattingMonthValues = {
      narrow: monthValues.narrow,
      abbreviated: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
      wide: monthValues.wide
    };
    var dayValues = {
      narrow: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
      short: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
      abbreviated: ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'],
      wide: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
    }; // https://www.unicode.org/cldr/charts/32/summary/de.html#1881

    var dayPeriodValues = {
      narrow: {
        am: 'vm.',
        pm: 'nm.',
        midnight: 'Mitternacht',
        noon: 'Mittag',
        morning: 'Morgen',
        afternoon: 'Nachm.',
        evening: 'Abend',
        night: 'Nacht'
      },
      abbreviated: {
        am: 'vorm.',
        pm: 'nachm.',
        midnight: 'Mitternacht',
        noon: 'Mittag',
        morning: 'Morgen',
        afternoon: 'Nachmittag',
        evening: 'Abend',
        night: 'Nacht'
      },
      wide: {
        am: 'vormittags',
        pm: 'nachmittags',
        midnight: 'Mitternacht',
        noon: 'Mittag',
        morning: 'Morgen',
        afternoon: 'Nachmittag',
        evening: 'Abend',
        night: 'Nacht'
      }
    };
    var formattingDayPeriodValues = {
      narrow: {
        am: 'vm.',
        pm: 'nm.',
        midnight: 'Mitternacht',
        noon: 'Mittag',
        morning: 'morgens',
        afternoon: 'nachm.',
        evening: 'abends',
        night: 'nachts'
      },
      abbreviated: {
        am: 'vorm.',
        pm: 'nachm.',
        midnight: 'Mitternacht',
        noon: 'Mittag',
        morning: 'morgens',
        afternoon: 'nachmittags',
        evening: 'abends',
        night: 'nachts'
      },
      wide: {
        am: 'vormittags',
        pm: 'nachmittags',
        midnight: 'Mitternacht',
        noon: 'Mittag',
        morning: 'morgens',
        afternoon: 'nachmittags',
        evening: 'abends',
        night: 'nachts'
      }
    };

    var ordinalNumber = function (dirtyNumber) {
      var number = Number(dirtyNumber);
      return number + '.';
    };

    var localize = {
      ordinalNumber: ordinalNumber,
      era: buildLocalizeFn({
        values: eraValues,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return quarter - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues,
        formattingValues: formattingMonthValues,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues,
        defaultWidth: 'wide',
        formattingValues: formattingDayPeriodValues,
        defaultFormattingWidth: 'wide'
      })
    };
    var localize$1 = localize;

    var matchOrdinalNumberPattern = /^(\d+)(\.)?/i;
    var parseOrdinalNumberPattern = /\d+/i;
    var matchEraPatterns = {
      narrow: /^(v\.? ?Chr\.?|n\.? ?Chr\.?)/i,
      abbreviated: /^(v\.? ?Chr\.?|n\.? ?Chr\.?)/i,
      wide: /^(vor Christus|vor unserer Zeitrechnung|nach Christus|unserer Zeitrechnung)/i
    };
    var parseEraPatterns = {
      any: [/^v/i, /^n/i]
    };
    var matchQuarterPatterns = {
      narrow: /^[1234]/i,
      abbreviated: /^q[1234]/i,
      wide: /^[1234](\.)? Quartal/i
    };
    var parseQuarterPatterns = {
      any: [/1/i, /2/i, /3/i, /4/i]
    };
    var matchMonthPatterns = {
      narrow: /^[jfmasond]/i,
      abbreviated: /^(j[aä]n|feb|mär[z]?|apr|mai|jun[i]?|jul[i]?|aug|sep|okt|nov|dez)\.?/i,
      wide: /^(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)/i
    };
    var parseMonthPatterns = {
      narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
      any: [/^j[aä]/i, /^f/i, /^mär/i, /^ap/i, /^mai/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
    };
    var matchDayPatterns = {
      narrow: /^[smdmf]/i,
      short: /^(so|mo|di|mi|do|fr|sa)/i,
      abbreviated: /^(son?|mon?|die?|mit?|don?|fre?|sam?)\.?/i,
      wide: /^(sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag)/i
    };
    var parseDayPatterns = {
      any: [/^so/i, /^mo/i, /^di/i, /^mi/i, /^do/i, /^f/i, /^sa/i]
    };
    var matchDayPeriodPatterns = {
      narrow: /^(vm\.?|nm\.?|Mitternacht|Mittag|morgens|nachm\.?|abends|nachts)/i,
      abbreviated: /^(vorm\.?|nachm\.?|Mitternacht|Mittag|morgens|nachm\.?|abends|nachts)/i,
      wide: /^(vormittags|nachmittags|Mitternacht|Mittag|morgens|nachmittags|abends|nachts)/i
    };
    var parseDayPeriodPatterns = {
      any: {
        am: /^v/i,
        pm: /^n/i,
        midnight: /^Mitte/i,
        noon: /^Mitta/i,
        morning: /morgens/i,
        afternoon: /nachmittags/i,
        // will never be matched. Afternoon is matched by `pm`
        evening: /abends/i,
        night: /nachts/i // will never be matched. Night is matched by `pm`

      }
    };
    var match = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern,
        parsePattern: parseOrdinalNumberPattern,
        valueCallback: function (value) {
          return parseInt(value);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPeriodPatterns,
        defaultParseWidth: 'any'
      })
    };
    var match$1 = match;

    /**
     * @type {Locale}
     * @category Locales
     * @summary German locale.
     * @language German
     * @iso-639-2 deu
     * @author Thomas Eilmsteiner [@DeMuu]{@link https://github.com/DeMuu}
     * @author Asia [@asia-t]{@link https://github.com/asia-t}
     * @author Van Vuong Ngo [@vanvuongngo]{@link https://github.com/vanvuongngo}
     * @author RomanErnst [@pex]{@link https://github.com/pex}
     * @author Philipp Keck [@Philipp91]{@link https://github.com/Philipp91}
     */
    var locale = {
      code: 'de',
      formatDistance: formatDistance$1,
      formatLong: formatLong$1,
      formatRelative: formatRelative$1,
      localize: localize$1,
      match: match$1,
      options: {
        weekStartsOn: 1
        /* Monday */
        ,
        firstWeekContainsDate: 4
      }
    };
    var de$1 = locale;

    /* src/views/admin/LunchMenuAdminDetails.svelte generated by Svelte v3.46.4 */

    const { console: console_1$1 } = globals;
    const file$3 = "src/views/admin/LunchMenuAdminDetails.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[14] = list;
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (124:4) {:else}
    function create_else_block(ctx) {
    	let section0;
    	let t0_value = JSON.stringify(/*lunchWeek*/ ctx[0]) + "";
    	let t0;
    	let t1;
    	let section1;
    	let div0;
    	let button0;
    	let t3;
    	let button1;

    	let t4_value = (/*lunchWeek*/ ctx[0].isPublished
    	? "Unpublish"
    	: "Publish") + "";

    	let t4;
    	let t5;
    	let section2;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value = /*lunchWeek*/ ctx[0].lunchDays;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			t0 = text(t0_value);
    			t1 = space();
    			section1 = element("section");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Save";
    			t3 = space();
    			button1 = element("button");
    			t4 = text(t4_value);
    			t5 = space();
    			section2 = element("section");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(section0, file$3, 124, 8, 4152);
    			attr_dev(button0, "class", "button is-link is-small");
    			add_location(button0, file$3, 127, 16, 4267);
    			attr_dev(button1, "class", "button is-text is-small");
    			add_location(button1, file$3, 130, 16, 4399);
    			attr_dev(div0, "class", "buttons");
    			add_location(div0, file$3, 126, 12, 4229);
    			add_location(section1, file$3, 125, 8, 4207);
    			attr_dev(div1, "class", "columns");
    			add_location(div1, file$3, 140, 12, 4762);
    			attr_dev(section2, "class", "mt-2");
    			add_location(section2, file$3, 139, 8, 4727);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(button1, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, section2, anchor);
    			append_dev(section2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lunchWeek*/ 1 && t0_value !== (t0_value = JSON.stringify(/*lunchWeek*/ ctx[0]) + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*lunchWeek*/ 1 && t4_value !== (t4_value = (/*lunchWeek*/ ctx[0].isPublished
    			? "Unpublish"
    			: "Publish") + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*lunchWeek, format, parseISO, de*/ 1) {
    				each_value = /*lunchWeek*/ ctx[0].lunchDays;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(section1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(section2);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(124:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (120:4) {#if loading}
    function create_if_block$1(ctx) {
    	let div;
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { spin: true, data: refresh, scale: "3" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(icon.$$.fragment);
    			attr_dev(div, "class", "section");
    			add_location(div, file$3, 120, 8, 4044);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(icon, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(icon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(120:4) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (142:16) {#each lunchWeek.lunchDays as lunchDay}
    function create_each_block(ctx) {
    	let div2;
    	let div1;
    	let label;
    	let t0_value = format(parseISO(/*lunchDay*/ ctx[13].day), "EEE dd.MM.yyyy", { locale: de$1 }) + "";
    	let t0;
    	let t1;
    	let div0;
    	let textarea;
    	let t2;
    	let mounted;
    	let dispose;

    	function textarea_input_handler() {
    		/*textarea_input_handler*/ ctx[8].call(textarea, /*each_value*/ ctx[14], /*lunchDay_index*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			label = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");
    			textarea = element("textarea");
    			t2 = space();
    			attr_dev(label, "for", "menuDetails");
    			attr_dev(label, "class", "label");
    			add_location(label, file$3, 144, 28, 4953);
    			attr_dev(textarea, "id", "menuDetails");
    			attr_dev(textarea, "class", "textarea");
    			attr_dev(textarea, "rows", "10");
    			add_location(textarea, file$3, 152, 32, 5353);
    			attr_dev(div0, "class", "control");
    			add_location(div0, file$3, 151, 28, 5299);
    			attr_dev(div1, "class", "field");
    			add_location(div1, file$3, 143, 24, 4905);
    			attr_dev(div2, "class", "column");
    			add_location(div2, file$3, 142, 20, 4860);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, label);
    			append_dev(label, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, textarea);
    			set_input_value(textarea, /*lunchDay*/ ctx[13].menuDetails);
    			append_dev(div2, t2);

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", textarea_input_handler);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*lunchWeek*/ 1 && t0_value !== (t0_value = format(parseISO(/*lunchDay*/ ctx[13].day), "EEE dd.MM.yyyy", { locale: de$1 }) + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*lunchWeek*/ 1) {
    				set_input_value(textarea, /*lunchDay*/ ctx[13].menuDetails);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(142:16) {#each lunchWeek.lunchDays as lunchDay}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let a1;
    	let t3;
    	let li2;
    	let a2;
    	let t4_value = /*$user*/ ctx[2].schoolName + "";
    	let t4;
    	let t5;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Home";
    			t1 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Lunch Menu Administration";
    			t3 = space();
    			li2 = element("li");
    			a2 = element("a");
    			t4 = text(t4_value);
    			t5 = space();
    			if_block.c();
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$3, 109, 16, 3738);
    			add_location(li0, file$3, 108, 12, 3717);
    			attr_dev(a1, "href", "/admin/manage-menus");
    			add_location(a1, file$3, 112, 16, 3810);
    			add_location(li1, file$3, 111, 12, 3789);
    			attr_dev(a2, "href", "/#");
    			add_location(a2, file$3, 115, 16, 3939);
    			attr_dev(li2, "class", "is-active");
    			add_location(li2, file$3, 114, 12, 3900);
    			add_location(ul, file$3, 107, 8, 3700);
    			attr_dev(nav, "class", "breadcrumb");
    			attr_dev(nav, "aria-label", "breadcrumbs");
    			add_location(nav, file$3, 106, 4, 3642);
    			add_location(div, file$3, 105, 0, 3632);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(a2, t4);
    			append_dev(div, t5);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*$user*/ 4) && t4_value !== (t4_value = /*$user*/ ctx[2].schoolName + "")) set_data_dev(t4, t4_value);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $user;
    	validate_store(user, 'user');
    	component_subscribe($$self, user, $$value => $$invalidate(2, $user = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LunchMenuAdminDetails', slots, []);
    	let { currentRoute } = $$props;
    	let routeLunchWeekId = currentRoute.namedParams.lunchWeekId;
    	let lunchWeek = { lunchDays: [] };
    	let loading = true;
    	let saving = true;
    	let publishing = true;

    	onMount(async () => {
    		try {
    			const response = await axios.get(`${"http://localhost:3000"}/api/lunch-weeks/${routeLunchWeekId}`);
    			$$invalidate(0, lunchWeek = response.data);
    			seedLunchDays();
    			$$invalidate(1, loading = false);
    		} catch(e) {
    			console.error(e);
    		}
    	});

    	function seedLunchDays() {
    		// first, we need to turn the ISO formatted lunchWeek.weekOf
    		// date into a date object
    		// the parseISO function comes from date-fns
    		const weekOfDate = parseISO(lunchWeek.weekOf);

    		for (let i = 0; i < 5; i++) {
    			// then we loop 5 times, starting with i = 0
    			// and adding 1 day each time, e.g., monday, then tuesday, etc
    			const calculatedDay = add(weekOfDate, { days: i });

    			const formattedDay = format(calculatedDay, "yyyy-MM-dd");

    			// if our lunchWeek.lunchDays list already has
    			// that day from the server, continue to the next iteration
    			if (lunchWeek.lunchDays.some(x => x.day === formattedDay)) {
    				continue;
    			}

    			// otherwise, create a new child lunch day object
    			// and splice it into the list at the correct position
    			const lunchDay = {
    				day: formattedDay,
    				lunchWeekId: lunchWeek.lunchWeekId,
    				menuDetails: null
    			};

    			lunchWeek.lunchDays.splice(i, 0, lunchDay);
    		}
    	}

    	async function save() {
    		saving = true;

    		for (let i = 0; i < lunchWeek.lunchDays.length; i++) {
    			const lunchDay = lunchWeek.lunchDays[i];

    			// if the item has an id, do a PUT
    			if (lunchDay.lunchDayId) {
    				await axios.put(`${"http://localhost:3000"}/api/lunch-weeks/${routeLunchWeekId}/lunch-day/${lunchDay.lunchDayId}`, lunchDay);
    			} else {
    				const response = await axios.post(`${"http://localhost:3000"}/api/lunch-weeks/${routeLunchWeekId}/lunch-day`, lunchDay); // otherwise do a POST and assign the resulting ID
    				lunchDay.lunchDayId = response.data.lunchDayId;
    			}
    		}

    		saving = false;
    	}

    	async function togglePublish() {
    		publishing = true;

    		// first stringify and parse to copy the lunchWeek object
    		let lunchWeekPayload = JSON.parse(JSON.stringify(lunchWeek));

    		// update the isPublished flag
    		lunchWeekPayload.isPublished = !lunchWeekPayload.isPublished;

    		// remove the lunchDays list
    		delete lunchWeekPayload.lunchDays;

    		await axios.put(`${"http://localhost:3000"}/api/lunch-weeks/${routeLunchWeekId}`, lunchWeekPayload);

    		// if successful, update the main lunchWeek object's state so that Svelte will react
    		$$invalidate(0, lunchWeek.isPublished = !lunchWeek.isPublished, lunchWeek);

    		publishing = false;
    	}

    	const writable_props = ['currentRoute'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<LunchMenuAdminDetails> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => save();
    	const click_handler_1 = () => togglePublish();

    	function textarea_input_handler(each_value, lunchDay_index) {
    		each_value[lunchDay_index].menuDetails = this.value;
    		$$invalidate(0, lunchWeek);
    	}

    	$$self.$$set = $$props => {
    		if ('currentRoute' in $$props) $$invalidate(5, currentRoute = $$props.currentRoute);
    	};

    	$$self.$capture_state = () => ({
    		user,
    		onMount,
    		axios,
    		Icon,
    		refresh,
    		add,
    		parseISO,
    		format,
    		de: de$1,
    		currentRoute,
    		routeLunchWeekId,
    		lunchWeek,
    		loading,
    		saving,
    		publishing,
    		seedLunchDays,
    		save,
    		togglePublish,
    		$user
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentRoute' in $$props) $$invalidate(5, currentRoute = $$props.currentRoute);
    		if ('routeLunchWeekId' in $$props) routeLunchWeekId = $$props.routeLunchWeekId;
    		if ('lunchWeek' in $$props) $$invalidate(0, lunchWeek = $$props.lunchWeek);
    		if ('loading' in $$props) $$invalidate(1, loading = $$props.loading);
    		if ('saving' in $$props) saving = $$props.saving;
    		if ('publishing' in $$props) publishing = $$props.publishing;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		lunchWeek,
    		loading,
    		$user,
    		save,
    		togglePublish,
    		currentRoute,
    		click_handler,
    		click_handler_1,
    		textarea_input_handler
    	];
    }

    class LunchMenuAdminDetails extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { currentRoute: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LunchMenuAdminDetails",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*currentRoute*/ ctx[5] === undefined && !('currentRoute' in props)) {
    			console_1$1.warn("<LunchMenuAdminDetails> was created without expected prop 'currentRoute'");
    		}
    	}

    	get currentRoute() {
    		throw new Error("<LunchMenuAdminDetails>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentRoute(value) {
    		throw new Error("<LunchMenuAdminDetails>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    var e=function(t,n){return (e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n]);})(t,n)};function t(t,n){function i(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(i.prototype=n.prototype,new i);}var n=function(){return (n=Object.assign||function(e){for(var t,n=1,i=arguments.length;n<i;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e}).apply(this,arguments)};function i(e,t){var n={};for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&t.indexOf(i)<0&&(n[i]=e[i]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(i=Object.getOwnPropertySymbols(e);r<i.length;r++)t.indexOf(i[r])<0&&Object.prototype.propertyIsEnumerable.call(e,i[r])&&(n[i[r]]=e[i[r]]);}return n}function r(e,t,n,i){return new(n||(n=Promise))((function(r,o){function c(e){try{a(i.next(e));}catch(e){o(e);}}function s(e){try{a(i.throw(e));}catch(e){o(e);}}function a(e){e.done?r(e.value):new n((function(t){t(e.value);})).then(c,s);}a((i=i.apply(e,t||[])).next());}))}function o(e,t){var n,i,r,o,c={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return o={next:s(0),throw:s(1),return:s(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function s(o){return function(s){return function(o){if(n)throw new TypeError("Generator is already executing.");for(;c;)try{if(n=1,i&&(r=2&o[0]?i.return:o[0]?i.throw||((r=i.return)&&r.call(i),0):i.next)&&!(r=r.call(i,o[1])).done)return r;switch(i=0,r&&(o=[2&o[0],r.value]),o[0]){case 0:case 1:r=o;break;case 4:return c.label++,{value:o[1],done:!1};case 5:c.label++,i=o[1],o=[0];continue;case 7:o=c.ops.pop(),c.trys.pop();continue;default:if(!(r=c.trys,(r=r.length>0&&r[r.length-1])||6!==o[0]&&2!==o[0])){c=0;continue}if(3===o[0]&&(!r||o[1]>r[0]&&o[1]<r[3])){c.label=o[1];break}if(6===o[0]&&c.label<r[1]){c.label=r[1],r=o;break}if(r&&c.label<r[2]){c.label=r[2],c.ops.push(o);break}r[2]&&c.ops.pop(),c.trys.pop();continue}o=t.call(e,c);}catch(e){o=[6,e],i=0;}finally{n=r=0;}if(5&o[0])throw o[1];return {value:o[0]?o[1]:void 0,done:!0}}([o,s])}}}var c="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};function s(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function a(e,t){return e(t={exports:{}},t.exports),t.exports}var u=function(e){return e&&e.Math==Math&&e},l=u("object"==typeof globalThis&&globalThis)||u("object"==typeof window&&window)||u("object"==typeof self&&self)||u("object"==typeof c&&c)||Function("return this")(),d=function(e){try{return !!e()}catch(e){return !0}},g=!d((function(){return 7!=Object.defineProperty({},1,{get:function(){return 7}})[1]})),I={}.propertyIsEnumerable,f=Object.getOwnPropertyDescriptor,p={f:f&&!I.call({1:2},1)?function(e){var t=f(this,e);return !!t&&t.enumerable}:I},h=function(e,t){return {enumerable:!(1&e),configurable:!(2&e),writable:!(4&e),value:t}},y={}.toString,b=function(e){return y.call(e).slice(8,-1)},m="".split,B=d((function(){return !Object("z").propertyIsEnumerable(0)}))?function(e){return "String"==b(e)?m.call(e,""):Object(e)}:Object,F=function(e){if(null==e)throw TypeError("Can't call method on "+e);return e},v=function(e){return B(F(e))},C=function(e){return "object"==typeof e?null!==e:"function"==typeof e},U=function(e,t){if(!C(e))return e;var n,i;if(t&&"function"==typeof(n=e.toString)&&!C(i=n.call(e)))return i;if("function"==typeof(n=e.valueOf)&&!C(i=n.call(e)))return i;if(!t&&"function"==typeof(n=e.toString)&&!C(i=n.call(e)))return i;throw TypeError("Can't convert object to primitive value")},S={}.hasOwnProperty,V=function(e,t){return S.call(e,t)},Z=l.document,X=C(Z)&&C(Z.createElement),G=function(e){return X?Z.createElement(e):{}},w=!g&&!d((function(){return 7!=Object.defineProperty(G("div"),"a",{get:function(){return 7}}).a})),R=Object.getOwnPropertyDescriptor,x={f:g?R:function(e,t){if(e=v(e),t=U(t,!0),w)try{return R(e,t)}catch(e){}if(V(e,t))return h(!p.f.call(e,t),e[t])}},A=function(e){if(!C(e))throw TypeError(String(e)+" is not an object");return e},Q=Object.defineProperty,W={f:g?Q:function(e,t,n){if(A(e),t=U(t,!0),A(n),w)try{return Q(e,t,n)}catch(e){}if("get"in n||"set"in n)throw TypeError("Accessors not supported");return "value"in n&&(e[t]=n.value),e}},L=g?function(e,t,n){return W.f(e,t,h(1,n))}:function(e,t,n){return e[t]=n,e},H=function(e,t){try{L(l,e,t);}catch(n){l[e]=t;}return t},J=l["__core-js_shared__"]||H("__core-js_shared__",{}),k=Function.toString;"function"!=typeof J.inspectSource&&(J.inspectSource=function(e){return k.call(e)});var E,Y,T,K=J.inspectSource,N=l.WeakMap,O="function"==typeof N&&/native code/.test(K(N)),z=a((function(e){(e.exports=function(e,t){return J[e]||(J[e]=void 0!==t?t:{})})("versions",[]).push({version:"3.6.5",mode:"global",copyright:"© 2020 Denis Pushkarev (zloirock.ru)"});})),j=0,P=Math.random(),_=function(e){return "Symbol("+String(void 0===e?"":e)+")_"+(++j+P).toString(36)},D=z("keys"),M=function(e){return D[e]||(D[e]=_(e))},q={},$=l.WeakMap;if(O){var ee=new $,te=ee.get,ne=ee.has,ie=ee.set;E=function(e,t){return ie.call(ee,e,t),t},Y=function(e){return te.call(ee,e)||{}},T=function(e){return ne.call(ee,e)};}else {var re=M("state");q[re]=!0,E=function(e,t){return L(e,re,t),t},Y=function(e){return V(e,re)?e[re]:{}},T=function(e){return V(e,re)};}var oe,ce={set:E,get:Y,has:T,enforce:function(e){return T(e)?Y(e):E(e,{})},getterFor:function(e){return function(t){var n;if(!C(t)||(n=Y(t)).type!==e)throw TypeError("Incompatible receiver, "+e+" required");return n}}},se=a((function(e){var t=ce.get,n=ce.enforce,i=String(String).split("String");(e.exports=function(e,t,r,o){var c=!!o&&!!o.unsafe,s=!!o&&!!o.enumerable,a=!!o&&!!o.noTargetGet;"function"==typeof r&&("string"!=typeof t||V(r,"name")||L(r,"name",t),n(r).source=i.join("string"==typeof t?t:"")),e!==l?(c?!a&&e[t]&&(s=!0):delete e[t],s?e[t]=r:L(e,t,r)):s?e[t]=r:H(t,r);})(Function.prototype,"toString",(function(){return "function"==typeof this&&t(this).source||K(this)}));})),ae=l,ue=function(e){return "function"==typeof e?e:void 0},le=function(e,t){return arguments.length<2?ue(ae[e])||ue(l[e]):ae[e]&&ae[e][t]||l[e]&&l[e][t]},de=Math.ceil,ge=Math.floor,Ie=function(e){return isNaN(e=+e)?0:(e>0?ge:de)(e)},fe=Math.min,pe=function(e){return e>0?fe(Ie(e),9007199254740991):0},he=Math.max,ye=Math.min,be=function(e){return function(t,n,i){var r,o=v(t),c=pe(o.length),s=function(e,t){var n=Ie(e);return n<0?he(n+t,0):ye(n,t)}(i,c);if(e&&n!=n){for(;c>s;)if((r=o[s++])!=r)return !0}else for(;c>s;s++)if((e||s in o)&&o[s]===n)return e||s||0;return !e&&-1}},me={includes:be(!0),indexOf:be(!1)},Be=me.indexOf,Fe=function(e,t){var n,i=v(e),r=0,o=[];for(n in i)!V(q,n)&&V(i,n)&&o.push(n);for(;t.length>r;)V(i,n=t[r++])&&(~Be(o,n)||o.push(n));return o},ve=["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"],Ce=ve.concat("length","prototype"),Ue={f:Object.getOwnPropertyNames||function(e){return Fe(e,Ce)}},Se={f:Object.getOwnPropertySymbols},Ve=le("Reflect","ownKeys")||function(e){var t=Ue.f(A(e)),n=Se.f;return n?t.concat(n(e)):t},Ze=function(e,t){for(var n=Ve(t),i=W.f,r=x.f,o=0;o<n.length;o++){var c=n[o];V(e,c)||i(e,c,r(t,c));}},Xe=/#|\.prototype\./,Ge=function(e,t){var n=Re[we(e)];return n==Ae||n!=xe&&("function"==typeof t?d(t):!!t)},we=Ge.normalize=function(e){return String(e).replace(Xe,".").toLowerCase()},Re=Ge.data={},xe=Ge.NATIVE="N",Ae=Ge.POLYFILL="P",Qe=Ge,We=x.f,Le=function(e,t){var n,i,r,o,c,s=e.target,a=e.global,u=e.stat;if(n=a?l:u?l[s]||H(s,{}):(l[s]||{}).prototype)for(i in t){if(o=t[i],r=e.noTargetGet?(c=We(n,i))&&c.value:n[i],!Qe(a?i:s+(u?".":"#")+i,e.forced)&&void 0!==r){if(typeof o==typeof r)continue;Ze(o,r);}(e.sham||r&&r.sham)&&L(o,"sham",!0),se(n,i,o,e);}},He=!!Object.getOwnPropertySymbols&&!d((function(){return !String(Symbol())})),Je=He&&!Symbol.sham&&"symbol"==typeof Symbol.iterator,ke=z("wks"),Ee=l.Symbol,Ye=Je?Ee:Ee&&Ee.withoutSetter||_,Te=function(e){return V(ke,e)||(He&&V(Ee,e)?ke[e]=Ee[e]:ke[e]=Ye("Symbol."+e)),ke[e]},Ke=Te("match"),Ne=function(e){if(function(e){var t;return C(e)&&(void 0!==(t=e[Ke])?!!t:"RegExp"==b(e))}(e))throw TypeError("The method doesn't accept regular expressions");return e},Oe=Te("match"),ze=function(e){var t=/./;try{"/./"[e](t);}catch(n){try{return t[Oe]=!1,"/./"[e](t)}catch(e){}}return !1},je=x.f,Pe="".startsWith,_e=Math.min,De=ze("startsWith"),Me=!(De||(oe=je(String.prototype,"startsWith"),!oe||oe.writable));Le({target:"String",proto:!0,forced:!Me&&!De},{startsWith:function(e){var t=String(F(this));Ne(e);var n=pe(_e(arguments.length>1?arguments[1]:void 0,t.length)),i=String(e);return Pe?Pe.call(t,i,n):t.slice(n,n+i.length)===i}});var qe,$e,et,tt=function(e){if("function"!=typeof e)throw TypeError(String(e)+" is not a function");return e},nt=function(e,t,n){if(tt(e),void 0===t)return e;switch(n){case 0:return function(){return e.call(t)};case 1:return function(n){return e.call(t,n)};case 2:return function(n,i){return e.call(t,n,i)};case 3:return function(n,i,r){return e.call(t,n,i,r)}}return function(){return e.apply(t,arguments)}},it=Function.call,rt=function(e,t,n){return nt(it,l[e].prototype[t],n)},ot=(rt("String","startsWith"),function(e){return function(t,n){var i,r,o=String(F(t)),c=Ie(n),s=o.length;return c<0||c>=s?e?"":void 0:(i=o.charCodeAt(c))<55296||i>56319||c+1===s||(r=o.charCodeAt(c+1))<56320||r>57343?e?o.charAt(c):i:e?o.slice(c,c+2):r-56320+(i-55296<<10)+65536}}),ct={codeAt:ot(!1),charAt:ot(!0)},st=function(e){return Object(F(e))},at=!d((function(){function e(){}return e.prototype.constructor=null,Object.getPrototypeOf(new e)!==e.prototype})),ut=M("IE_PROTO"),lt=Object.prototype,dt=at?Object.getPrototypeOf:function(e){return e=st(e),V(e,ut)?e[ut]:"function"==typeof e.constructor&&e instanceof e.constructor?e.constructor.prototype:e instanceof Object?lt:null},gt=Te("iterator"),It=!1;[].keys&&("next"in(et=[].keys())?($e=dt(dt(et)))!==Object.prototype&&(qe=$e):It=!0),null==qe&&(qe={}),V(qe,gt)||L(qe,gt,(function(){return this}));var ft,pt={IteratorPrototype:qe,BUGGY_SAFARI_ITERATORS:It},ht=Object.keys||function(e){return Fe(e,ve)},yt=g?Object.defineProperties:function(e,t){A(e);for(var n,i=ht(t),r=i.length,o=0;r>o;)W.f(e,n=i[o++],t[n]);return e},bt=le("document","documentElement"),mt=M("IE_PROTO"),Bt=function(){},Ft=function(e){return "<script>"+e+"<\/script>"},vt=function(){try{ft=document.domain&&new ActiveXObject("htmlfile");}catch(e){}var e,t;vt=ft?function(e){e.write(Ft("")),e.close();var t=e.parentWindow.Object;return e=null,t}(ft):((t=G("iframe")).style.display="none",bt.appendChild(t),t.src=String("javascript:"),(e=t.contentWindow.document).open(),e.write(Ft("document.F=Object")),e.close(),e.F);for(var n=ve.length;n--;)delete vt.prototype[ve[n]];return vt()};q[mt]=!0;var Ct=Object.create||function(e,t){var n;return null!==e?(Bt.prototype=A(e),n=new Bt,Bt.prototype=null,n[mt]=e):n=vt(),void 0===t?n:yt(n,t)},Ut=W.f,St=Te("toStringTag"),Vt=function(e,t,n){e&&!V(e=n?e:e.prototype,St)&&Ut(e,St,{configurable:!0,value:t});},Zt={},Xt=pt.IteratorPrototype,Gt=function(){return this},wt=Object.setPrototypeOf||("__proto__"in{}?function(){var e,t=!1,n={};try{(e=Object.getOwnPropertyDescriptor(Object.prototype,"__proto__").set).call(n,[]),t=n instanceof Array;}catch(e){}return function(n,i){return A(n),function(e){if(!C(e)&&null!==e)throw TypeError("Can't set "+String(e)+" as a prototype")}(i),t?e.call(n,i):n.__proto__=i,n}}():void 0),Rt=pt.IteratorPrototype,xt=pt.BUGGY_SAFARI_ITERATORS,At=Te("iterator"),Qt=function(){return this},Wt=function(e,t,n,i,r,o,c){!function(e,t,n){var i=t+" Iterator";e.prototype=Ct(Xt,{next:h(1,n)}),Vt(e,i,!1),Zt[i]=Gt;}(n,t,i);var s,a,u,l=function(e){if(e===r&&p)return p;if(!xt&&e in I)return I[e];switch(e){case"keys":case"values":case"entries":return function(){return new n(this,e)}}return function(){return new n(this)}},d=t+" Iterator",g=!1,I=e.prototype,f=I[At]||I["@@iterator"]||r&&I[r],p=!xt&&f||l(r),y="Array"==t&&I.entries||f;if(y&&(s=dt(y.call(new e)),Rt!==Object.prototype&&s.next&&(dt(s)!==Rt&&(wt?wt(s,Rt):"function"!=typeof s[At]&&L(s,At,Qt)),Vt(s,d,!0))),"values"==r&&f&&"values"!==f.name&&(g=!0,p=function(){return f.call(this)}),I[At]!==p&&L(I,At,p),Zt[t]=p,r)if(a={values:l("values"),keys:o?p:l("keys"),entries:l("entries")},c)for(u in a)(xt||g||!(u in I))&&se(I,u,a[u]);else Le({target:t,proto:!0,forced:xt||g},a);return a},Lt=ct.charAt,Ht=ce.set,Jt=ce.getterFor("String Iterator");Wt(String,"String",(function(e){Ht(this,{type:"String Iterator",string:String(e),index:0});}),(function(){var e,t=Jt(this),n=t.string,i=t.index;return i>=n.length?{value:void 0,done:!0}:(e=Lt(n,i),t.index+=e.length,{value:e,done:!1})}));var kt=function(e,t,n,i){try{return i?t(A(n)[0],n[1]):t(n)}catch(t){var r=e.return;throw void 0!==r&&A(r.call(e)),t}},Et=Te("iterator"),Yt=Array.prototype,Tt=function(e){return void 0!==e&&(Zt.Array===e||Yt[Et]===e)},Kt=function(e,t,n){var i=U(t);i in e?W.f(e,i,h(0,n)):e[i]=n;},Nt={};Nt[Te("toStringTag")]="z";var Ot="[object z]"===String(Nt),zt=Te("toStringTag"),jt="Arguments"==b(function(){return arguments}()),Pt=Ot?b:function(e){var t,n,i;return void 0===e?"Undefined":null===e?"Null":"string"==typeof(n=function(e,t){try{return e[t]}catch(e){}}(t=Object(e),zt))?n:jt?b(t):"Object"==(i=b(t))&&"function"==typeof t.callee?"Arguments":i},_t=Te("iterator"),Dt=function(e){if(null!=e)return e[_t]||e["@@iterator"]||Zt[Pt(e)]},Mt=Te("iterator"),qt=!1;try{var $t=0,en={next:function(){return {done:!!$t++}},return:function(){qt=!0;}};en[Mt]=function(){return this},Array.from(en,(function(){throw 2}));}catch(e){}var tn=function(e,t){if(!t&&!qt)return !1;var n=!1;try{var i={};i[Mt]=function(){return {next:function(){return {done:n=!0}}}},e(i);}catch(e){}return n},nn=!tn((function(e){Array.from(e);}));Le({target:"Array",stat:!0,forced:nn},{from:function(e){var t,n,i,r,o,c,s=st(e),a="function"==typeof this?this:Array,u=arguments.length,l=u>1?arguments[1]:void 0,d=void 0!==l,g=Dt(s),I=0;if(d&&(l=nt(l,u>2?arguments[2]:void 0,2)),null==g||a==Array&&Tt(g))for(n=new a(t=pe(s.length));t>I;I++)c=d?l(s[I],I):s[I],Kt(n,I,c);else for(o=(r=g.call(s)).next,n=new a;!(i=o.call(r)).done;I++)c=d?kt(r,l,[i.value,I],!0):i.value,Kt(n,I,c);return n.length=I,n}});ae.Array.from;var rn,on="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof DataView,cn=W.f,sn=l.Int8Array,an=sn&&sn.prototype,un=l.Uint8ClampedArray,ln=un&&un.prototype,dn=sn&&dt(sn),gn=an&&dt(an),In=Object.prototype,fn=In.isPrototypeOf,pn=Te("toStringTag"),hn=_("TYPED_ARRAY_TAG"),yn=on&&!!wt&&"Opera"!==Pt(l.opera),bn={Int8Array:1,Uint8Array:1,Uint8ClampedArray:1,Int16Array:2,Uint16Array:2,Int32Array:4,Uint32Array:4,Float32Array:4,Float64Array:8},mn=function(e){return C(e)&&V(bn,Pt(e))};for(rn in bn)l[rn]||(yn=!1);if((!yn||"function"!=typeof dn||dn===Function.prototype)&&(dn=function(){throw TypeError("Incorrect invocation")},yn))for(rn in bn)l[rn]&&wt(l[rn],dn);if((!yn||!gn||gn===In)&&(gn=dn.prototype,yn))for(rn in bn)l[rn]&&wt(l[rn].prototype,gn);if(yn&&dt(ln)!==gn&&wt(ln,gn),g&&!V(gn,pn))for(rn in cn(gn,pn,{get:function(){return C(this)?this[hn]:void 0}}),bn)l[rn]&&L(l[rn],hn,rn);var Bn=function(e){if(mn(e))return e;throw TypeError("Target is not a typed array")},Fn=function(e){if(wt){if(fn.call(dn,e))return e}else for(var t in bn)if(V(bn,rn)){var n=l[t];if(n&&(e===n||fn.call(n,e)))return e}throw TypeError("Target is not a typed array constructor")},vn=function(e,t,n){if(g){if(n)for(var i in bn){var r=l[i];r&&V(r.prototype,e)&&delete r.prototype[e];}gn[e]&&!n||se(gn,e,n?t:yn&&an[e]||t);}},Cn=Te("species"),Un=Bn,Sn=Fn,Vn=[].slice;vn("slice",(function(e,t){for(var n=Vn.call(Un(this),e,t),i=function(e,t){var n,i=A(e).constructor;return void 0===i||null==(n=A(i)[Cn])?t:tt(n)}(this,this.constructor),r=0,o=n.length,c=new(Sn(i))(o);o>r;)c[r]=n[r++];return c}),d((function(){new Int8Array(1).slice();})));var Zn=Te("unscopables"),Xn=Array.prototype;null==Xn[Zn]&&W.f(Xn,Zn,{configurable:!0,value:Ct(null)});var Gn=function(e){Xn[Zn][e]=!0;},wn=Object.defineProperty,Rn={},xn=function(e){throw e},An=me.includes,Qn=function(e,t){if(V(Rn,e))return Rn[e];t||(t={});var n=[][e],i=!!V(t,"ACCESSORS")&&t.ACCESSORS,r=V(t,0)?t[0]:xn,o=V(t,1)?t[1]:void 0;return Rn[e]=!!n&&!d((function(){if(i&&!g)return !0;var e={length:-1};i?wn(e,1,{enumerable:!0,get:xn}):e[1]=1,n.call(e,r,o);}))}("indexOf",{ACCESSORS:!0,1:0});Le({target:"Array",proto:!0,forced:!Qn},{includes:function(e){return An(this,e,arguments.length>1?arguments[1]:void 0)}}),Gn("includes");rt("Array","includes");Le({target:"String",proto:!0,forced:!ze("includes")},{includes:function(e){return !!~String(F(this)).indexOf(Ne(e),arguments.length>1?arguments[1]:void 0)}});rt("String","includes");var Wn=!d((function(){return Object.isExtensible(Object.preventExtensions({}))})),Ln=a((function(e){var t=W.f,n=_("meta"),i=0,r=Object.isExtensible||function(){return !0},o=function(e){t(e,n,{value:{objectID:"O"+ ++i,weakData:{}}});},c=e.exports={REQUIRED:!1,fastKey:function(e,t){if(!C(e))return "symbol"==typeof e?e:("string"==typeof e?"S":"P")+e;if(!V(e,n)){if(!r(e))return "F";if(!t)return "E";o(e);}return e[n].objectID},getWeakData:function(e,t){if(!V(e,n)){if(!r(e))return !0;if(!t)return !1;o(e);}return e[n].weakData},onFreeze:function(e){return Wn&&c.REQUIRED&&r(e)&&!V(e,n)&&o(e),e}};q[n]=!0;})),Hn=(Ln.REQUIRED,Ln.fastKey,Ln.getWeakData,Ln.onFreeze,a((function(e){var t=function(e,t){this.stopped=e,this.result=t;};(e.exports=function(e,n,i,r,o){var c,s,a,u,l,d,g,I=nt(n,i,r?2:1);if(o)c=e;else {if("function"!=typeof(s=Dt(e)))throw TypeError("Target is not iterable");if(Tt(s)){for(a=0,u=pe(e.length);u>a;a++)if((l=r?I(A(g=e[a])[0],g[1]):I(e[a]))&&l instanceof t)return l;return new t(!1)}c=s.call(e);}for(d=c.next;!(g=d.call(c)).done;)if("object"==typeof(l=kt(c,I,g.value,r))&&l&&l instanceof t)return l;return new t(!1)}).stop=function(e){return new t(!0,e)};}))),Jn=function(e,t,n){if(!(e instanceof t))throw TypeError("Incorrect "+(n?n+" ":"")+"invocation");return e},kn=function(e,t,n){for(var i in t)se(e,i,t[i],n);return e},En=Te("species"),Yn=W.f,Tn=Ln.fastKey,Kn=ce.set,Nn=ce.getterFor,On=(function(e,t,n){var i=-1!==e.indexOf("Map"),r=-1!==e.indexOf("Weak"),o=i?"set":"add",c=l[e],s=c&&c.prototype,a=c,u={},g=function(e){var t=s[e];se(s,e,"add"==e?function(e){return t.call(this,0===e?0:e),this}:"delete"==e?function(e){return !(r&&!C(e))&&t.call(this,0===e?0:e)}:"get"==e?function(e){return r&&!C(e)?void 0:t.call(this,0===e?0:e)}:"has"==e?function(e){return !(r&&!C(e))&&t.call(this,0===e?0:e)}:function(e,n){return t.call(this,0===e?0:e,n),this});};if(Qe(e,"function"!=typeof c||!(r||s.forEach&&!d((function(){(new c).entries().next();})))))a=n.getConstructor(t,e,i,o),Ln.REQUIRED=!0;else if(Qe(e,!0)){var I=new a,f=I[o](r?{}:-0,1)!=I,p=d((function(){I.has(1);})),h=tn((function(e){new c(e);})),y=!r&&d((function(){for(var e=new c,t=5;t--;)e[o](t,t);return !e.has(-0)}));h||((a=t((function(t,n){Jn(t,a,e);var r=function(e,t,n){var i,r;return wt&&"function"==typeof(i=t.constructor)&&i!==n&&C(r=i.prototype)&&r!==n.prototype&&wt(e,r),e}(new c,t,a);return null!=n&&Hn(n,r[o],r,i),r}))).prototype=s,s.constructor=a),(p||y)&&(g("delete"),g("has"),i&&g("get")),(y||f)&&g(o),r&&s.clear&&delete s.clear;}u[e]=a,Le({global:!0,forced:a!=c},u),Vt(a,e),r||n.setStrong(a,e,i);}("Set",(function(e){return function(){return e(this,arguments.length?arguments[0]:void 0)}}),{getConstructor:function(e,t,n,i){var r=e((function(e,o){Jn(e,r,t),Kn(e,{type:t,index:Ct(null),first:void 0,last:void 0,size:0}),g||(e.size=0),null!=o&&Hn(o,e[i],e,n);})),o=Nn(t),c=function(e,t,n){var i,r,c=o(e),a=s(e,t);return a?a.value=n:(c.last=a={index:r=Tn(t,!0),key:t,value:n,previous:i=c.last,next:void 0,removed:!1},c.first||(c.first=a),i&&(i.next=a),g?c.size++:e.size++,"F"!==r&&(c.index[r]=a)),e},s=function(e,t){var n,i=o(e),r=Tn(t);if("F"!==r)return i.index[r];for(n=i.first;n;n=n.next)if(n.key==t)return n};return kn(r.prototype,{clear:function(){for(var e=o(this),t=e.index,n=e.first;n;)n.removed=!0,n.previous&&(n.previous=n.previous.next=void 0),delete t[n.index],n=n.next;e.first=e.last=void 0,g?e.size=0:this.size=0;},delete:function(e){var t=this,n=o(t),i=s(t,e);if(i){var r=i.next,c=i.previous;delete n.index[i.index],i.removed=!0,c&&(c.next=r),r&&(r.previous=c),n.first==i&&(n.first=r),n.last==i&&(n.last=c),g?n.size--:t.size--;}return !!i},forEach:function(e){for(var t,n=o(this),i=nt(e,arguments.length>1?arguments[1]:void 0,3);t=t?t.next:n.first;)for(i(t.value,t.key,this);t&&t.removed;)t=t.previous;},has:function(e){return !!s(this,e)}}),kn(r.prototype,n?{get:function(e){var t=s(this,e);return t&&t.value},set:function(e,t){return c(this,0===e?0:e,t)}}:{add:function(e){return c(this,e=0===e?0:e,e)}}),g&&Yn(r.prototype,"size",{get:function(){return o(this).size}}),r},setStrong:function(e,t,n){var i=t+" Iterator",r=Nn(t),o=Nn(i);Wt(e,t,(function(e,t){Kn(this,{type:i,target:e,state:r(e),kind:t,last:void 0});}),(function(){for(var e=o(this),t=e.kind,n=e.last;n&&n.removed;)n=n.previous;return e.target&&(e.last=n=n?n.next:e.state.first)?"keys"==t?{value:n.key,done:!1}:"values"==t?{value:n.value,done:!1}:{value:[n.key,n.value],done:!1}:(e.target=void 0,{value:void 0,done:!0})}),n?"entries":"values",!n,!0),function(e){var t=le(e),n=W.f;g&&t&&!t[En]&&n(t,En,{configurable:!0,get:function(){return this}});}(t);}}),Ot?{}.toString:function(){return "[object "+Pt(this)+"]"});Ot||se(Object.prototype,"toString",On,{unsafe:!0});var zn={CSSRuleList:0,CSSStyleDeclaration:0,CSSValueList:0,ClientRectList:0,DOMRectList:0,DOMStringList:0,DOMTokenList:1,DataTransferItemList:0,FileList:0,HTMLAllCollection:0,HTMLCollection:0,HTMLFormElement:0,HTMLSelectElement:0,MediaList:0,MimeTypeArray:0,NamedNodeMap:0,NodeList:1,PaintRequestList:0,Plugin:0,PluginArray:0,SVGLengthList:0,SVGNumberList:0,SVGPathSegList:0,SVGPointList:0,SVGStringList:0,SVGTransformList:0,SourceBufferList:0,StyleSheetList:0,TextTrackCueList:0,TextTrackList:0,TouchList:0},jn=ce.set,Pn=ce.getterFor("Array Iterator"),_n=Wt(Array,"Array",(function(e,t){jn(this,{type:"Array Iterator",target:v(e),index:0,kind:t});}),(function(){var e=Pn(this),t=e.target,n=e.kind,i=e.index++;return !t||i>=t.length?(e.target=void 0,{value:void 0,done:!0}):"keys"==n?{value:i,done:!1}:"values"==n?{value:t[i],done:!1}:{value:[i,t[i]],done:!1}}),"values");Zt.Arguments=Zt.Array,Gn("keys"),Gn("values"),Gn("entries");var Dn=Te("iterator"),Mn=Te("toStringTag"),qn=_n.values;for(var $n in zn){var ei=l[$n],ti=ei&&ei.prototype;if(ti){if(ti[Dn]!==qn)try{L(ti,Dn,qn);}catch(e){ti[Dn]=qn;}if(ti[Mn]||L(ti,Mn,$n),zn[$n])for(var ni in _n)if(ti[ni]!==_n[ni])try{L(ti,ni,_n[ni]);}catch(e){ti[ni]=_n[ni];}}}ae.Set;function ii(e){var t=this.constructor;return this.then((function(n){return t.resolve(e()).then((function(){return n}))}),(function(n){return t.resolve(e()).then((function(){return t.reject(n)}))}))}var ri=setTimeout;function oi(e){return Boolean(e&&void 0!==e.length)}function ci(){}function si(e){if(!(this instanceof si))throw new TypeError("Promises must be constructed via new");if("function"!=typeof e)throw new TypeError("not a function");this._state=0,this._handled=!1,this._value=void 0,this._deferreds=[],Ii(e,this);}function ai(e,t){for(;3===e._state;)e=e._value;0!==e._state?(e._handled=!0,si._immediateFn((function(){var n=1===e._state?t.onFulfilled:t.onRejected;if(null!==n){var i;try{i=n(e._value);}catch(e){return void li(t.promise,e)}ui(t.promise,i);}else (1===e._state?ui:li)(t.promise,e._value);}))):e._deferreds.push(t);}function ui(e,t){try{if(t===e)throw new TypeError("A promise cannot be resolved with itself.");if(t&&("object"==typeof t||"function"==typeof t)){var n=t.then;if(t instanceof si)return e._state=3,e._value=t,void di(e);if("function"==typeof n)return void Ii((i=n,r=t,function(){i.apply(r,arguments);}),e)}e._state=1,e._value=t,di(e);}catch(t){li(e,t);}var i,r;}function li(e,t){e._state=2,e._value=t,di(e);}function di(e){2===e._state&&0===e._deferreds.length&&si._immediateFn((function(){e._handled||si._unhandledRejectionFn(e._value);}));for(var t=0,n=e._deferreds.length;t<n;t++)ai(e,e._deferreds[t]);e._deferreds=null;}function gi(e,t,n){this.onFulfilled="function"==typeof e?e:null,this.onRejected="function"==typeof t?t:null,this.promise=n;}function Ii(e,t){var n=!1;try{e((function(e){n||(n=!0,ui(t,e));}),(function(e){n||(n=!0,li(t,e));}));}catch(e){if(n)return;n=!0,li(t,e);}}si.prototype.catch=function(e){return this.then(null,e)},si.prototype.then=function(e,t){var n=new this.constructor(ci);return ai(this,new gi(e,t,n)),n},si.prototype.finally=ii,si.all=function(e){return new si((function(t,n){if(!oi(e))return n(new TypeError("Promise.all accepts an array"));var i=Array.prototype.slice.call(e);if(0===i.length)return t([]);var r=i.length;function o(e,c){try{if(c&&("object"==typeof c||"function"==typeof c)){var s=c.then;if("function"==typeof s)return void s.call(c,(function(t){o(e,t);}),n)}i[e]=c,0==--r&&t(i);}catch(e){n(e);}}for(var c=0;c<i.length;c++)o(c,i[c]);}))},si.resolve=function(e){return e&&"object"==typeof e&&e.constructor===si?e:new si((function(t){t(e);}))},si.reject=function(e){return new si((function(t,n){n(e);}))},si.race=function(e){return new si((function(t,n){if(!oi(e))return n(new TypeError("Promise.race accepts an array"));for(var i=0,r=e.length;i<r;i++)si.resolve(e[i]).then(t,n);}))},si._immediateFn="function"==typeof setImmediate&&function(e){setImmediate(e);}||function(e){ri(e,0);},si._unhandledRejectionFn=function(e){"undefined"!=typeof console&&console&&console.warn("Possible Unhandled Promise Rejection:",e);};var fi=function(){if("undefined"!=typeof self)return self;if("undefined"!=typeof window)return window;if("undefined"!=typeof global)return global;throw new Error("unable to locate global object")}();"Promise"in fi?fi.Promise.prototype.finally||(fi.Promise.prototype.finally=ii):fi.Promise=si,function(e){function t(){}function n(e,t){if(e=void 0===e?"utf-8":e,t=void 0===t?{fatal:!1}:t,-1===r.indexOf(e.toLowerCase()))throw new RangeError("Failed to construct 'TextDecoder': The encoding label provided ('"+e+"') is invalid.");if(t.fatal)throw Error("Failed to construct 'TextDecoder': the 'fatal' option is unsupported.")}function i(e){for(var t=0,n=Math.min(65536,e.length+1),i=new Uint16Array(n),r=[],o=0;;){var c=t<e.length;if(!c||o>=n-1){if(r.push(String.fromCharCode.apply(null,i.subarray(0,o))),!c)return r.join("");e=e.subarray(t),o=t=0;}if(0==(128&(c=e[t++])))i[o++]=c;else if(192==(224&c)){var s=63&e[t++];i[o++]=(31&c)<<6|s;}else if(224==(240&c)){s=63&e[t++];var a=63&e[t++];i[o++]=(31&c)<<12|s<<6|a;}else if(240==(248&c)){65535<(c=(7&c)<<18|(s=63&e[t++])<<12|(a=63&e[t++])<<6|63&e[t++])&&(c-=65536,i[o++]=c>>>10&1023|55296,c=56320|1023&c),i[o++]=c;}}}if(e.TextEncoder&&e.TextDecoder)return !1;var r=["utf-8","utf8","unicode-1-1-utf-8"];Object.defineProperty(t.prototype,"encoding",{value:"utf-8"}),t.prototype.encode=function(e,t){if((t=void 0===t?{stream:!1}:t).stream)throw Error("Failed to encode: the 'stream' option is unsupported.");t=0;for(var n=e.length,i=0,r=Math.max(32,n+(n>>>1)+7),o=new Uint8Array(r>>>3<<3);t<n;){var c=e.charCodeAt(t++);if(55296<=c&&56319>=c){if(t<n){var s=e.charCodeAt(t);56320==(64512&s)&&(++t,c=((1023&c)<<10)+(1023&s)+65536);}if(55296<=c&&56319>=c)continue}if(i+4>o.length&&(r+=8,r=(r*=1+t/e.length*2)>>>3<<3,(s=new Uint8Array(r)).set(o),o=s),0==(4294967168&c))o[i++]=c;else {if(0==(4294965248&c))o[i++]=c>>>6&31|192;else if(0==(4294901760&c))o[i++]=c>>>12&15|224,o[i++]=c>>>6&63|128;else {if(0!=(4292870144&c))continue;o[i++]=c>>>18&7|240,o[i++]=c>>>12&63|128,o[i++]=c>>>6&63|128;}o[i++]=63&c|128;}}return o.slice?o.slice(0,i):o.subarray(0,i)},Object.defineProperty(n.prototype,"encoding",{value:"utf-8"}),Object.defineProperty(n.prototype,"fatal",{value:!1}),Object.defineProperty(n.prototype,"ignoreBOM",{value:!1});var o=i;"function"==typeof Buffer&&Buffer.from?o=function(e){return Buffer.from(e.buffer,e.byteOffset,e.byteLength).toString("utf-8")}:"function"==typeof Blob&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&(o=function(e){var t=URL.createObjectURL(new Blob([e],{type:"text/plain;charset=UTF-8"}));try{var n=new XMLHttpRequest;return n.open("GET",t,!1),n.send(),n.responseText}catch(t){return i(e)}finally{URL.revokeObjectURL(t);}}),n.prototype.decode=function(e,t){if((t=void 0===t?{stream:!1}:t).stream)throw Error("Failed to decode: the 'stream' option is unsupported.");return e=e instanceof Uint8Array?e:e.buffer instanceof ArrayBuffer?new Uint8Array(e.buffer):new Uint8Array(e),o(e)},e.TextEncoder=t,e.TextDecoder=n;}("undefined"!=typeof window?window:c),function(){function e(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function t(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i);}}function n(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}function i(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&o(e,t);}function r(e){return (r=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function o(e,t){return (o=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function s(){if("undefined"==typeof Reflect||!Reflect.construct)return !1;if(Reflect.construct.sham)return !1;if("function"==typeof Proxy)return !0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(e){return !1}}function a(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function u(e,t){return !t||"object"!=typeof t&&"function"!=typeof t?a(e):t}function l(e){var t=s();return function(){var n,i=r(e);if(t){var o=r(this).constructor;n=Reflect.construct(i,arguments,o);}else n=i.apply(this,arguments);return u(this,n)}}function d(e,t){for(;!Object.prototype.hasOwnProperty.call(e,t)&&null!==(e=r(e)););return e}function g(e,t,n){return (g="undefined"!=typeof Reflect&&Reflect.get?Reflect.get:function(e,t,n){var i=d(e,t);if(i){var r=Object.getOwnPropertyDescriptor(i,t);return r.get?r.get.call(n):r.value}})(e,t,n||e)}var I=function(){function t(){e(this,t),Object.defineProperty(this,"listeners",{value:{},writable:!0,configurable:!0});}return n(t,[{key:"addEventListener",value:function(e,t){e in this.listeners||(this.listeners[e]=[]),this.listeners[e].push(t);}},{key:"removeEventListener",value:function(e,t){if(e in this.listeners)for(var n=this.listeners[e],i=0,r=n.length;i<r;i++)if(n[i]===t)return void n.splice(i,1)}},{key:"dispatchEvent",value:function(e){var t=this;if(e.type in this.listeners){for(var n=function(n){setTimeout((function(){return n.call(t,e)}));},i=this.listeners[e.type],r=0,o=i.length;r<o;r++)n(i[r]);return !e.defaultPrevented}}}]),t}(),f=function(t){i(c,t);var o=l(c);function c(){var t;return e(this,c),(t=o.call(this)).listeners||I.call(a(t)),Object.defineProperty(a(t),"aborted",{value:!1,writable:!0,configurable:!0}),Object.defineProperty(a(t),"onabort",{value:null,writable:!0,configurable:!0}),t}return n(c,[{key:"toString",value:function(){return "[object AbortSignal]"}},{key:"dispatchEvent",value:function(e){"abort"===e.type&&(this.aborted=!0,"function"==typeof this.onabort&&this.onabort.call(this,e)),g(r(c.prototype),"dispatchEvent",this).call(this,e);}}]),c}(I),p=function(){function t(){e(this,t),Object.defineProperty(this,"signal",{value:new f,writable:!0,configurable:!0});}return n(t,[{key:"abort",value:function(){var e;try{e=new Event("abort");}catch(t){"undefined"!=typeof document?document.createEvent?(e=document.createEvent("Event")).initEvent("abort",!1,!1):(e=document.createEventObject()).type="abort":e={type:"abort",bubbles:!1,cancelable:!1};}this.signal.dispatchEvent(e);}},{key:"toString",value:function(){return "[object AbortController]"}}]),t}();function h(e){return e.__FORCE_INSTALL_ABORTCONTROLLER_POLYFILL?(console.log("__FORCE_INSTALL_ABORTCONTROLLER_POLYFILL=true is set, will force install polyfill"),!0):"function"==typeof e.Request&&!e.Request.prototype.hasOwnProperty("signal")||!e.AbortController}"undefined"!=typeof Symbol&&Symbol.toStringTag&&(p.prototype[Symbol.toStringTag]="AbortController",f.prototype[Symbol.toStringTag]="AbortSignal"),function(e){h(e)&&(e.AbortController=p,e.AbortSignal=f);}("undefined"!=typeof self?self:c);}();var pi=a((function(e,t){Object.defineProperty(t,"__esModule",{value:!0});var n=function(){function e(){var e=this;this.locked=new Map,this.addToLocked=function(t,n){var i=e.locked.get(t);void 0===i?void 0===n?e.locked.set(t,[]):e.locked.set(t,[n]):void 0!==n&&(i.unshift(n),e.locked.set(t,i));},this.isLocked=function(t){return e.locked.has(t)},this.lock=function(t){return new Promise((function(n,i){e.isLocked(t)?e.addToLocked(t,n):(e.addToLocked(t),n());}))},this.unlock=function(t){var n=e.locked.get(t);if(void 0!==n&&0!==n.length){var i=n.pop();e.locked.set(t,n),void 0!==i&&setTimeout(i,0);}else e.locked.delete(t);};}return e.getInstance=function(){return void 0===e.instance&&(e.instance=new e),e.instance},e}();t.default=function(){return n.getInstance()};}));s(pi);var hi=s(a((function(e,t){var n=c&&c.__awaiter||function(e,t,n,i){return new(n||(n=Promise))((function(r,o){function c(e){try{a(i.next(e));}catch(e){o(e);}}function s(e){try{a(i.throw(e));}catch(e){o(e);}}function a(e){e.done?r(e.value):new n((function(t){t(e.value);})).then(c,s);}a((i=i.apply(e,t||[])).next());}))},i=c&&c.__generator||function(e,t){var n,i,r,o,c={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return o={next:s(0),throw:s(1),return:s(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function s(o){return function(s){return function(o){if(n)throw new TypeError("Generator is already executing.");for(;c;)try{if(n=1,i&&(r=2&o[0]?i.return:o[0]?i.throw||((r=i.return)&&r.call(i),0):i.next)&&!(r=r.call(i,o[1])).done)return r;switch(i=0,r&&(o=[2&o[0],r.value]),o[0]){case 0:case 1:r=o;break;case 4:return c.label++,{value:o[1],done:!1};case 5:c.label++,i=o[1],o=[0];continue;case 7:o=c.ops.pop(),c.trys.pop();continue;default:if(!(r=c.trys,(r=r.length>0&&r[r.length-1])||6!==o[0]&&2!==o[0])){c=0;continue}if(3===o[0]&&(!r||o[1]>r[0]&&o[1]<r[3])){c.label=o[1];break}if(6===o[0]&&c.label<r[1]){c.label=r[1],r=o;break}if(r&&c.label<r[2]){c.label=r[2],c.ops.push(o);break}r[2]&&c.ops.pop(),c.trys.pop();continue}o=t.call(e,c);}catch(e){o=[6,e],i=0;}finally{n=r=0;}if(5&o[0])throw o[1];return {value:o[0]?o[1]:void 0,done:!0}}([o,s])}}};Object.defineProperty(t,"__esModule",{value:!0});var r="browser-tabs-lock-key";function o(e){return new Promise((function(t){return setTimeout(t,e)}))}function s(e){for(var t="0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",n="",i=0;i<e;i++){n+=t[Math.floor(Math.random()*t.length)];}return n}var a=function(){function e(){this.acquiredIatSet=new Set,this.id=Date.now().toString()+s(15),this.acquireLock=this.acquireLock.bind(this),this.releaseLock=this.releaseLock.bind(this),this.releaseLock__private__=this.releaseLock__private__.bind(this),this.waitForSomethingToChange=this.waitForSomethingToChange.bind(this),this.refreshLockWhileAcquired=this.refreshLockWhileAcquired.bind(this),void 0===e.waiters&&(e.waiters=[]);}return e.prototype.acquireLock=function(t,c){return void 0===c&&(c=5e3),n(this,void 0,void 0,(function(){var n,a,u,l,d,g;return i(this,(function(i){switch(i.label){case 0:n=Date.now()+s(4),a=Date.now()+c,u=r+"-"+t,l=window.localStorage,i.label=1;case 1:return Date.now()<a?[4,o(30)]:[3,8];case 2:return i.sent(),null!==l.getItem(u)?[3,5]:(d=this.id+"-"+t+"-"+n,[4,o(Math.floor(25*Math.random()))]);case 3:return i.sent(),l.setItem(u,JSON.stringify({id:this.id,iat:n,timeoutKey:d,timeAcquired:Date.now(),timeRefreshed:Date.now()})),[4,o(30)];case 4:return i.sent(),null!==(g=l.getItem(u))&&(g=JSON.parse(g)).id===this.id&&g.iat===n?(this.acquiredIatSet.add(n),this.refreshLockWhileAcquired(u,n),[2,!0]):[3,7];case 5:return e.lockCorrector(),[4,this.waitForSomethingToChange(a)];case 6:i.sent(),i.label=7;case 7:return n=Date.now()+s(4),[3,1];case 8:return [2,!1]}}))}))},e.prototype.refreshLockWhileAcquired=function(e,t){return n(this,void 0,void 0,(function(){var r=this;return i(this,(function(o){return setTimeout((function(){return n(r,void 0,void 0,(function(){var n,r;return i(this,(function(i){switch(i.label){case 0:return [4,pi.default().lock(t)];case 1:return i.sent(),this.acquiredIatSet.has(t)?(n=window.localStorage,null===(r=n.getItem(e))?(pi.default().unlock(t),[2]):((r=JSON.parse(r)).timeRefreshed=Date.now(),n.setItem(e,JSON.stringify(r)),pi.default().unlock(t),this.refreshLockWhileAcquired(e,t),[2])):(pi.default().unlock(t),[2])}}))}))}),1e3),[2]}))}))},e.prototype.waitForSomethingToChange=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(n){switch(n.label){case 0:return [4,new Promise((function(n){var i=!1,r=Date.now(),o=!1;function c(){if(o||(window.removeEventListener("storage",c),e.removeFromWaiting(c),clearTimeout(s),o=!0),!i){i=!0;var t=50-(Date.now()-r);t>0?setTimeout(n,t):n();}}window.addEventListener("storage",c),e.addToWaiting(c);var s=setTimeout(c,Math.max(0,t-Date.now()));}))];case 1:return n.sent(),[2]}}))}))},e.addToWaiting=function(t){this.removeFromWaiting(t),void 0!==e.waiters&&e.waiters.push(t);},e.removeFromWaiting=function(t){void 0!==e.waiters&&(e.waiters=e.waiters.filter((function(e){return e!==t})));},e.notifyWaiters=function(){void 0!==e.waiters&&e.waiters.slice().forEach((function(e){return e()}));},e.prototype.releaseLock=function(e){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return [4,this.releaseLock__private__(e)];case 1:return [2,t.sent()]}}))}))},e.prototype.releaseLock__private__=function(t){return n(this,void 0,void 0,(function(){var n,o,c;return i(this,(function(i){switch(i.label){case 0:return n=window.localStorage,o=r+"-"+t,null===(c=n.getItem(o))?[2]:(c=JSON.parse(c)).id!==this.id?[3,2]:[4,pi.default().lock(c.iat)];case 1:i.sent(),this.acquiredIatSet.delete(c.iat),n.removeItem(o),pi.default().unlock(c.iat),e.notifyWaiters(),i.label=2;case 2:return [2]}}))}))},e.lockCorrector=function(){for(var t=Date.now()-5e3,n=window.localStorage,i=Object.keys(n),o=!1,c=0;c<i.length;c++){var s=i[c];if(s.includes(r)){var a=n.getItem(s);null!==a&&(void 0===(a=JSON.parse(a)).timeRefreshed&&a.timeAcquired<t||void 0!==a.timeRefreshed&&a.timeRefreshed<t)&&(n.removeItem(s),o=!0);}}o&&e.notifyWaiters();},e.waiters=void 0,e}();t.default=a;})));var yi={timeoutInSeconds:60},bi=["login_required","consent_required","interaction_required","account_selection_required","access_denied"],mi=function(e){function n(t,i){var r=e.call(this,i)||this;return r.error=t,r.error_description=i,Object.setPrototypeOf(r,n.prototype),r}return t(n,e),n.fromPayload=function(e){return new n(e.error,e.error_description)},n}(Error),Bi=function(e){function n(t,i,r,o){void 0===o&&(o=null);var c=e.call(this,t,i)||this;return c.state=r,c.appState=o,Object.setPrototypeOf(c,n.prototype),c}return t(n,e),n}(mi),Fi=function(e){function n(){var t=e.call(this,"timeout","Timeout")||this;return Object.setPrototypeOf(t,n.prototype),t}return t(n,e),n}(mi),vi=function(e){function n(t){var i=e.call(this)||this;return i.popup=t,Object.setPrototypeOf(i,n.prototype),i}return t(n,e),n}(Fi),Ci=function(e,t,n){return void 0===n&&(n=60),new Promise((function(i,r){var o=window.document.createElement("iframe");o.setAttribute("width","0"),o.setAttribute("height","0"),o.style.display="none";var c=function(){window.document.body.contains(o)&&window.document.body.removeChild(o);},s=setTimeout((function(){r(new Fi),c();}),1e3*n),a=function(e){if(e.origin==t&&e.data&&"authorization_response"===e.data.type){var n=e.source;n&&n.close(),e.data.response.error?r(mi.fromPayload(e.data.response)):i(e.data.response),clearTimeout(s),window.removeEventListener("message",a,!1),setTimeout(c,2e3);}};window.addEventListener("message",a,!1),window.document.body.appendChild(o),o.setAttribute("src",e);}))},Ui=function(e,t){var n,i,r,o=t.popup;if(o?o.location.href=e:(n=e,i=window.screenX+(window.innerWidth-400)/2,r=window.screenY+(window.innerHeight-600)/2,o=window.open(n,"auth0:authorize:popup","left="+i+",top="+r+",width=400,height=600,resizable,scrollbars=yes,status=1")),!o)throw new Error("Could not open popup");return new Promise((function(e,n){var i=setTimeout((function(){n(new vi(o));}),1e3*(t.timeoutInSeconds||60));window.addEventListener("message",(function(t){if(t.data&&"authorization_response"===t.data.type){if(clearTimeout(i),o.close(),t.data.response.error)return n(mi.fromPayload(t.data.response));e(t.data.response);}}));}))},Si=function(){return window.crypto||window.msCrypto},Vi=function(){var e=Si();return e.subtle||e.webkitSubtle},Zi=function(){var e="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_~.",t="";return Array.from(Si().getRandomValues(new Uint8Array(43))).forEach((function(n){return t+=e[n%e.length]})),t},Xi=function(e){return btoa(e)},Gi=function(e){return Object.keys(e).filter((function(t){return void 0!==e[t]})).map((function(t){return encodeURIComponent(t)+"="+encodeURIComponent(e[t])})).join("&")},wi=function(e){return r(void 0,void 0,void 0,(function(){var t;return o(this,(function(n){switch(n.label){case 0:return t=Vi().digest({name:"SHA-256"},(new TextEncoder).encode(e)),window.msCrypto?[2,new Promise((function(e,n){t.oncomplete=function(t){e(t.target.result);},t.onerror=function(e){n(e.error);},t.onabort=function(){n("The digest operation was aborted");};}))]:[4,t];case 1:return [2,n.sent()]}}))}))},Ri=function(e){return function(e){return decodeURIComponent(atob(e).split("").map((function(e){return "%"+("00"+e.charCodeAt(0).toString(16)).slice(-2)})).join(""))}(e.replace(/_/g,"/").replace(/-/g,"+"))},xi=function(e){var t=new Uint8Array(e);return function(e){var t={"+":"-","/":"_","=":""};return e.replace(/[+/=]/g,(function(e){return t[e]}))}(window.btoa(String.fromCharCode.apply(String,Array.from(t))))},Ai=function(e,t,i,c,s,a){return r(void 0,void 0,void 0,(function(){var r,u;return o(this,(function(o){switch(o.label){case 0:return a?(delete c.signal,[2,(g=n({url:e,audience:t,scope:i,timeout:s},c),I=a,new Promise((function(e,t){var n=new MessageChannel;n.port1.onmessage=function(n){n.data.error?t(new Error(n.data.error)):e(n.data);},I.postMessage(g,[n.port2]);})))]):[3,1];case 1:return [4,(l=e,d=c,d=d||{},new Promise((function(e,t){var n=new XMLHttpRequest,i=[],r=[],o={},c=function(){return {ok:2==(n.status/100|0),statusText:n.statusText,status:n.status,url:n.responseURL,text:function(){return Promise.resolve(n.responseText)},json:function(){return Promise.resolve(JSON.parse(n.responseText))},blob:function(){return Promise.resolve(new Blob([n.response]))},clone:c,headers:{keys:function(){return i},entries:function(){return r},get:function(e){return o[e.toLowerCase()]},has:function(e){return e.toLowerCase()in o}}}};for(var s in n.open(d.method||"get",l,!0),n.onload=function(){n.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm,(function(e,t,n){i.push(t=t.toLowerCase()),r.push([t,n]),o[t]=o[t]?o[t]+","+n:n;})),e(c());},n.onerror=t,n.withCredentials="include"==d.credentials,d.headers)n.setRequestHeader(s,d.headers[s]);n.send(d.body||null);})))];case 2:return r=o.sent(),u={ok:r.ok},[4,r.json()];case 3:return [2,(u.json=o.sent(),u)]}var l,d,g,I;}))}))},Qi=function(e,t,i,r,o,c){void 0===c&&(c=1e4);var s,a=new AbortController,u=a.signal,l=n(n({},r),{signal:u});return Promise.race([Ai(e,t,i,l,c,o),new Promise((function(e,t){s=setTimeout((function(){a.abort(),t(new Error("Timeout when executing 'fetch'"));}),c);}))]).finally((function(){clearTimeout(s);}))},Wi=function(e,t,n,c,s,a){return r(void 0,void 0,void 0,(function(){var r,u,l,d,g,I,f,p,h,y;return o(this,(function(o){switch(o.label){case 0:r=null,l=0,o.label=1;case 1:if(!(l<3))return [3,6];o.label=2;case 2:return o.trys.push([2,4,,5]),[4,Qi(e,n,c,s,a,t)];case 3:return u=o.sent(),r=null,[3,6];case 4:return d=o.sent(),r=d,[3,5];case 5:return l++,[3,1];case 6:if(r)throw r.message=r.message||"Failed to fetch",r;if(g=u.json,I=g.error,f=g.error_description,p=i(g,["error","error_description"]),!u.ok)throw h=f||"HTTP error. Unable to fetch "+e,(y=new Error(h)).error=I||"request_error",y.error_description=h,y;return [2,p]}}))}))},Li=function(e,t){return r(void 0,void 0,void 0,(function(){var r=e.baseUrl,c=e.timeout,s=e.audience,a=e.scope,u=i(e,["baseUrl","timeout","audience","scope"]);return o(this,(function(e){switch(e.label){case 0:return [4,Wi(r+"/oauth/token",c,s||"default",a,{method:"POST",body:JSON.stringify(n({redirect_uri:window.location.origin},u)),headers:{"Content-type":"application/json"}},t)];case 1:return [2,e.sent()]}}))}))},Hi=function(e){return Array.from(new Set(e))},Ji=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return Hi(e.join(" ").trim().split(/\s+/)).join(" ")},ki=function(e){return "@@auth0spajs@@::"+e.client_id+"::"+e.audience+"::"+e.scope},Ei=function(e){var t=Math.floor(Date.now()/1e3)+e.expires_in;return {body:e,expiresAt:Math.min(t,e.decodedToken.claims.exp)}},Yi=function(){function e(){}return e.prototype.save=function(e){var t=ki(e),n=Ei(e);window.localStorage.setItem(t,JSON.stringify(n));},e.prototype.get=function(e,t){void 0===t&&(t=0);var n=ki(e),i=this.readJson(n),r=Math.floor(Date.now()/1e3);if(i){if(!(i.expiresAt-t<r))return i.body;if(i.body.refresh_token){var o=this.stripData(i);return this.writeJson(n,o),o.body}localStorage.removeItem(n);}},e.prototype.clear=function(){for(var e=localStorage.length-1;e>=0;e--)localStorage.key(e).startsWith("@@auth0spajs@@")&&localStorage.removeItem(localStorage.key(e));},e.prototype.readJson=function(e){var t,n=window.localStorage.getItem(e);if(n&&(t=JSON.parse(n)))return t},e.prototype.writeJson=function(e,t){localStorage.setItem(e,JSON.stringify(t));},e.prototype.stripData=function(e){return {body:{refresh_token:e.body.refresh_token},expiresAt:e.expiresAt}},e}(),Ti=function(){this.enclosedCache=function(){var e={body:{},expiresAt:0};return {save:function(t){var n=ki(t),i=Ei(t);e[n]=i;},get:function(t,n){void 0===n&&(n=0);var i=ki(t),r=e[i],o=Math.floor(Date.now()/1e3);if(r)return r.expiresAt-n<o?r.body.refresh_token?(r.body={refresh_token:r.body.refresh_token},r.body):void delete e[i]:r.body},clear:function(){e={body:{},expiresAt:0};}}}();},Ki=function(){function e(e){this.storage=e,this.transaction=this.storage.get("a0.spajs.txs");}return e.prototype.create=function(e){this.transaction=e,this.storage.save("a0.spajs.txs",e,{daysUntilExpire:1});},e.prototype.get=function(){return this.transaction},e.prototype.remove=function(){delete this.transaction,this.storage.remove("a0.spajs.txs");},e}(),Ni=function(e){return "number"==typeof e},Oi=["iss","aud","exp","nbf","iat","jti","azp","nonce","auth_time","at_hash","c_hash","acr","amr","sub_jwk","cnf","sip_from_tag","sip_date","sip_callid","sip_cseq_num","sip_via_branch","orig","dest","mky","events","toe","txn","rph","sid","vot","vtm"],zi=function(e){if(!e.id_token)throw new Error("ID token is required but missing");var t=function(e){var t=e.split("."),n=t[0],i=t[1],r=t[2];if(3!==t.length||!n||!i||!r)throw new Error("ID token could not be decoded");var o=JSON.parse(Ri(i)),c={__raw:e},s={};return Object.keys(o).forEach((function(e){c[e]=o[e],Oi.includes(e)||(s[e]=o[e]);})),{encoded:{header:n,payload:i,signature:r},header:JSON.parse(Ri(n)),claims:c,user:s}}(e.id_token);if(!t.claims.iss)throw new Error("Issuer (iss) claim must be a string present in the ID token");if(t.claims.iss!==e.iss)throw new Error('Issuer (iss) claim mismatch in the ID token; expected "'+e.iss+'", found "'+t.claims.iss+'"');if(!t.user.sub)throw new Error("Subject (sub) claim must be a string present in the ID token");if("RS256"!==t.header.alg)throw new Error('Signature algorithm of "'+t.header.alg+'" is not supported. Expected the ID token to be signed with "RS256".');if(!t.claims.aud||"string"!=typeof t.claims.aud&&!Array.isArray(t.claims.aud))throw new Error("Audience (aud) claim must be a string or array of strings present in the ID token");if(Array.isArray(t.claims.aud)){if(!t.claims.aud.includes(e.aud))throw new Error('Audience (aud) claim mismatch in the ID token; expected "'+e.aud+'" but was not one of "'+t.claims.aud.join(", ")+'"');if(t.claims.aud.length>1){if(!t.claims.azp)throw new Error("Authorized Party (azp) claim must be a string present in the ID token when Audience (aud) claim has multiple values");if(t.claims.azp!==e.aud)throw new Error('Authorized Party (azp) claim mismatch in the ID token; expected "'+e.aud+'", found "'+t.claims.azp+'"')}}else if(t.claims.aud!==e.aud)throw new Error('Audience (aud) claim mismatch in the ID token; expected "'+e.aud+'" but found "'+t.claims.aud+'"');if(e.nonce){if(!t.claims.nonce)throw new Error("Nonce (nonce) claim must be a string present in the ID token");if(t.claims.nonce!==e.nonce)throw new Error('Nonce (nonce) claim mismatch in the ID token; expected "'+e.nonce+'", found "'+t.claims.nonce+'"')}if(e.max_age&&!Ni(t.claims.auth_time))throw new Error("Authentication Time (auth_time) claim must be a number present in the ID token when Max Age (max_age) is specified");if(!Ni(t.claims.exp))throw new Error("Expiration Time (exp) claim must be a number present in the ID token");if(!Ni(t.claims.iat))throw new Error("Issued At (iat) claim must be a number present in the ID token");var n=e.leeway||60,i=new Date(Date.now()),r=new Date(0),o=new Date(0),c=new Date(0);if(c.setUTCSeconds(parseInt(t.claims.auth_time)+e.max_age+n),r.setUTCSeconds(t.claims.exp+n),o.setUTCSeconds(t.claims.nbf-n),i>r)throw new Error("Expiration Time (exp) claim error in the ID token; current time ("+i+") is after expiration time ("+r+")");if(Ni(t.claims.nbf)&&i<o)throw new Error("Not Before time (nbf) claim in the ID token indicates that this token can't be used just yet. Currrent time ("+i+") is before "+o);if(Ni(t.claims.auth_time)&&i>c)throw new Error("Authentication Time (auth_time) claim in the ID token indicates that too much time has passed since the last end-user authentication. Currrent time ("+i+") is after last auth at "+c);return t},ji=a((function(e,t){var n=c&&c.__assign||function(){return (n=Object.assign||function(e){for(var t,n=1,i=arguments.length;n<i;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e}).apply(this,arguments)};function i(e,t){if(!t)return "";var n="; "+e;return !0===t?n:n+"="+t}function r(e,t,n){return encodeURIComponent(e).replace(/%(23|24|26|2B|5E|60|7C)/g,decodeURIComponent).replace(/\(/g,"%28").replace(/\)/g,"%29")+"="+encodeURIComponent(t).replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g,decodeURIComponent)+function(e){if("number"==typeof e.expires){var t=new Date;t.setMilliseconds(t.getMilliseconds()+864e5*e.expires),e.expires=t;}return i("Expires",e.expires?e.expires.toUTCString():"")+i("Domain",e.domain)+i("Path",e.path)+i("Secure",e.secure)+i("SameSite",e.sameSite)}(n)}function o(e){for(var t={},n=e?e.split("; "):[],i=/(%[\dA-F]{2})+/gi,r=0;r<n.length;r++){var o=n[r].split("="),c=o.slice(1).join("=");'"'===c.charAt(0)&&(c=c.slice(1,-1));try{t[o[0].replace(i,decodeURIComponent)]=c.replace(i,decodeURIComponent);}catch(e){}}return t}function s(){return o(document.cookie)}function a(e,t,i){document.cookie=r(e,t,n({path:"/"},i));}t.__esModule=!0,t.encode=r,t.parse=o,t.getAll=s,t.get=function(e){return s()[e]},t.set=a,t.remove=function(e,t){a(e,"",n(n({},t),{expires:-1}));};}));s(ji);ji.encode,ji.parse,ji.getAll;var Pi=ji.get,_i=ji.set,Di=ji.remove,Mi={get:function(e){var t=Pi(e);if(void 0!==t)return JSON.parse(t)},save:function(e,t,n){var i={};"https:"===window.location.protocol&&(i={secure:!0,sameSite:"none"}),i.expires=n.daysUntilExpire,_i(e,JSON.stringify(t),i);},remove:function(e){Di(e);}},qi={get:function(e){var t=Mi.get(e);return t||Mi.get("_legacy_"+e)},save:function(e,t,n){var i={};"https:"===window.location.protocol&&(i={secure:!0}),i.expires=n.daysUntilExpire,_i("_legacy_"+e,JSON.stringify(t),i),Mi.save(e,t,n);},remove:function(e){Mi.remove(e),Mi.remove("_legacy_"+e);}},$i={get:function(e){var t=sessionStorage.getItem(e);if(void 0!==t)return JSON.parse(t)},save:function(e,t){sessionStorage.setItem(e,JSON.stringify(t));},remove:function(e){sessionStorage.removeItem(e);}};function er(e,t,n){var i=void 0===t?null:t,r=function(e,t){var n=atob(e);if(t){for(var i=new Uint8Array(n.length),r=0,o=n.length;r<o;++r)i[r]=n.charCodeAt(r);return String.fromCharCode.apply(null,new Uint16Array(i.buffer))}return n}(e,void 0!==n&&n),o=r.indexOf("\n",10)+1,c=r.substring(o)+(i?"//# sourceMappingURL="+i:""),s=new Blob([c],{type:"application/javascript"});return URL.createObjectURL(s)}var tr,nr,ir,rr,or=(tr="Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwovKiEgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioKQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuCkxpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSAiTGljZW5zZSIpOyB5b3UgbWF5IG5vdCB1c2UKdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUKTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAKClRISVMgQ09ERSBJUyBQUk9WSURFRCBPTiBBTiAqQVMgSVMqIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkKS0lORCwgRUlUSEVSIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIFdJVEhPVVQgTElNSVRBVElPTiBBTlkgSU1QTElFRApXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgVElUTEUsIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLApNRVJDSEFOVEFCTElUWSBPUiBOT04tSU5GUklOR0VNRU5ULgoKU2VlIHRoZSBBcGFjaGUgVmVyc2lvbiAyLjAgTGljZW5zZSBmb3Igc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zCmFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4KKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi8KdmFyIGU9ZnVuY3Rpb24oKXtyZXR1cm4oZT1PYmplY3QuYXNzaWdufHxmdW5jdGlvbihlKXtmb3IodmFyIHIsdD0xLG49YXJndW1lbnRzLmxlbmd0aDt0PG47dCsrKWZvcih2YXIgbyBpbiByPWFyZ3VtZW50c1t0XSlPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocixvKSYmKGVbb109cltvXSk7cmV0dXJuIGV9KS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9O2Z1bmN0aW9uIHIoZSxyKXt2YXIgdCxuLG8scyxhPXtsYWJlbDowLHNlbnQ6ZnVuY3Rpb24oKXtpZigxJm9bMF0pdGhyb3cgb1sxXTtyZXR1cm4gb1sxXX0sdHJ5czpbXSxvcHM6W119O3JldHVybiBzPXtuZXh0OmkoMCksdGhyb3c6aSgxKSxyZXR1cm46aSgyKX0sImZ1bmN0aW9uIj09dHlwZW9mIFN5bWJvbCYmKHNbU3ltYm9sLml0ZXJhdG9yXT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSkscztmdW5jdGlvbiBpKHMpe3JldHVybiBmdW5jdGlvbihpKXtyZXR1cm4gZnVuY3Rpb24ocyl7aWYodCl0aHJvdyBuZXcgVHlwZUVycm9yKCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuIik7Zm9yKDthOyl0cnl7aWYodD0xLG4mJihvPTImc1swXT9uLnJldHVybjpzWzBdP24udGhyb3d8fCgobz1uLnJldHVybikmJm8uY2FsbChuKSwwKTpuLm5leHQpJiYhKG89by5jYWxsKG4sc1sxXSkpLmRvbmUpcmV0dXJuIG87c3dpdGNoKG49MCxvJiYocz1bMiZzWzBdLG8udmFsdWVdKSxzWzBdKXtjYXNlIDA6Y2FzZSAxOm89czticmVhaztjYXNlIDQ6cmV0dXJuIGEubGFiZWwrKyx7dmFsdWU6c1sxXSxkb25lOiExfTtjYXNlIDU6YS5sYWJlbCsrLG49c1sxXSxzPVswXTtjb250aW51ZTtjYXNlIDc6cz1hLm9wcy5wb3AoKSxhLnRyeXMucG9wKCk7Y29udGludWU7ZGVmYXVsdDppZighKG89YS50cnlzLChvPW8ubGVuZ3RoPjAmJm9bby5sZW5ndGgtMV0pfHw2IT09c1swXSYmMiE9PXNbMF0pKXthPTA7Y29udGludWV9aWYoMz09PXNbMF0mJighb3x8c1sxXT5vWzBdJiZzWzFdPG9bM10pKXthLmxhYmVsPXNbMV07YnJlYWt9aWYoNj09PXNbMF0mJmEubGFiZWw8b1sxXSl7YS5sYWJlbD1vWzFdLG89czticmVha31pZihvJiZhLmxhYmVsPG9bMl0pe2EubGFiZWw9b1syXSxhLm9wcy5wdXNoKHMpO2JyZWFrfW9bMl0mJmEub3BzLnBvcCgpLGEudHJ5cy5wb3AoKTtjb250aW51ZX1zPXIuY2FsbChlLGEpfWNhdGNoKGUpe3M9WzYsZV0sbj0wfWZpbmFsbHl7dD1vPTB9aWYoNSZzWzBdKXRocm93IHNbMV07cmV0dXJue3ZhbHVlOnNbMF0/c1sxXTp2b2lkIDAsZG9uZTohMH19KFtzLGldKX19fXZhciB0PXt9LG49ZnVuY3Rpb24oZSxyKXtyZXR1cm4gZSsifCIrcn07YWRkRXZlbnRMaXN0ZW5lcigibWVzc2FnZSIsKGZ1bmN0aW9uKG8pe3ZhciBzLGEsaSx1LGMsbCxmLHAsaCx5LGI7cmV0dXJuIHA9dm9pZCAwLGg9dm9pZCAwLGI9ZnVuY3Rpb24oKXt2YXIgcCxoLHksYixkLHYsdyxnO3JldHVybiByKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cz1vLmRhdGEsYT1zLnVybCxpPXMudGltZW91dCx1PXMuYXVkaWVuY2UsYz1zLnNjb3BlLGw9ZnVuY3Rpb24oZSxyKXt2YXIgdD17fTtmb3IodmFyIG4gaW4gZSlPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZSxuKSYmci5pbmRleE9mKG4pPDAmJih0W25dPWVbbl0pO2lmKG51bGwhPWUmJiJmdW5jdGlvbiI9PXR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKXt2YXIgbz0wO2ZvcihuPU9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZSk7bzxuLmxlbmd0aDtvKyspci5pbmRleE9mKG5bb10pPDAmJk9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChlLG5bb10pJiYodFtuW29dXT1lW25bb11dKX1yZXR1cm4gdH0ocyxbInVybCIsInRpbWVvdXQiLCJhdWRpZW5jZSIsInNjb3BlIl0pLGY9by5wb3J0c1swXSxyLmxhYmVsPTE7Y2FzZSAxOmlmKHIudHJ5cy5wdXNoKFsxLDcsLDhdKSwhKGg9SlNPTi5wYXJzZShsLmJvZHkpKS5yZWZyZXNoX3Rva2VuJiYicmVmcmVzaF90b2tlbiI9PT1oLmdyYW50X3R5cGUpe2lmKCEoeT1mdW5jdGlvbihlLHIpe3JldHVybiB0W24oZSxyKV19KHUsYykpKXRocm93IG5ldyBFcnJvcigiVGhlIHdlYiB3b3JrZXIgaXMgbWlzc2luZyB0aGUgcmVmcmVzaCB0b2tlbiIpO2wuYm9keT1KU09OLnN0cmluZ2lmeShlKGUoe30saCkse3JlZnJlc2hfdG9rZW46eX0pKX1iPW5ldyBBYm9ydENvbnRyb2xsZXIsZD1iLnNpZ25hbCx2PXZvaWQgMCxyLmxhYmVsPTI7Y2FzZSAyOnJldHVybiByLnRyeXMucHVzaChbMiw0LCw1XSksWzQsUHJvbWlzZS5yYWNlKFsoaz1pLG5ldyBQcm9taXNlKChmdW5jdGlvbihlKXtyZXR1cm4gc2V0VGltZW91dChlLGspfSkpKSxmZXRjaChhLGUoZSh7fSxsKSx7c2lnbmFsOmR9KSldKV07Y2FzZSAzOnJldHVybiB2PXIuc2VudCgpLFszLDVdO2Nhc2UgNDpyZXR1cm4gdz1yLnNlbnQoKSxmLnBvc3RNZXNzYWdlKHtlcnJvcjp3Lm1lc3NhZ2V9KSxbMl07Y2FzZSA1OnJldHVybiB2P1s0LHYuanNvbigpXTooYi5hYm9ydCgpLFsyXSk7Y2FzZSA2OnJldHVybihwPXIuc2VudCgpKS5yZWZyZXNoX3Rva2VuPyhmdW5jdGlvbihlLHIsbyl7dFtuKHIsbyldPWV9KHAucmVmcmVzaF90b2tlbix1LGMpLGRlbGV0ZSBwLnJlZnJlc2hfdG9rZW4pOmZ1bmN0aW9uKGUscil7ZGVsZXRlIHRbbihlLHIpXX0odSxjKSxmLnBvc3RNZXNzYWdlKHtvazp2Lm9rLGpzb246cH0pLFszLDhdO2Nhc2UgNzpyZXR1cm4gZz1yLnNlbnQoKSxmLnBvc3RNZXNzYWdlKHtvazohMSxqc29uOntlcnJvcl9kZXNjcmlwdGlvbjpnLm1lc3NhZ2V9fSksWzMsOF07Y2FzZSA4OnJldHVyblsyXX12YXIga30pKX0sbmV3KCh5PXZvaWQgMCl8fCh5PVByb21pc2UpKSgoZnVuY3Rpb24oZSxyKXtmdW5jdGlvbiB0KGUpe3RyeXtvKGIubmV4dChlKSl9Y2F0Y2goZSl7cihlKX19ZnVuY3Rpb24gbihlKXt0cnl7byhiLnRocm93KGUpKX1jYXRjaChlKXtyKGUpfX1mdW5jdGlvbiBvKHIpe3IuZG9uZT9lKHIudmFsdWUpOm5ldyB5KChmdW5jdGlvbihlKXtlKHIudmFsdWUpfSkpLnRoZW4odCxuKX1vKChiPWIuYXBwbHkocCxofHxbXSkpLm5leHQoKSl9KSl9KSk7Cgo=",nr="data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW4ud29ya2VyLmpzIiwic291cmNlcyI6WyJ3b3JrZXI6Ly93ZWItd29ya2VyL25vZGVfbW9kdWxlcy90c2xpYi90c2xpYi5lczYuanMiLCJ3b3JrZXI6Ly93ZWItd29ya2VyL3NyYy9jb25zdGFudHMudHMiLCJ3b3JrZXI6Ly93ZWItd29ya2VyL3NyYy90b2tlbi53b3JrZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG5MaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2VcclxudGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGVcclxuTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuXHJcblRISVMgQ09ERSBJUyBQUk9WSURFRCBPTiBBTiAqQVMgSVMqIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcclxuS0lORCwgRUlUSEVSIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIFdJVEhPVVQgTElNSVRBVElPTiBBTlkgSU1QTElFRFxyXG5XQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgVElUTEUsIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLFxyXG5NRVJDSEFOVEFCTElUWSBPUiBOT04tSU5GUklOR0VNRU5ULlxyXG5cclxuU2VlIHRoZSBBcGFjaGUgVmVyc2lvbiAyLjAgTGljZW5zZSBmb3Igc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXHJcbmFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXh0ZW5kcyhkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSkge1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgZXhwb3J0cykge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAoIWV4cG9ydHMuaGFzT3duUHJvcGVydHkocCkpIGV4cG9ydHNbcF0gPSBtW3BdO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xyXG4gICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdLCBpID0gMDtcclxuICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xyXG4gICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcclxuICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0dlbmVyYXRvcih0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlmIChnW25dKSBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogbiA9PT0gXCJyZXR1cm5cIiB9IDogZiA/IGYodikgOiB2OyB9IDogZjsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY1ZhbHVlcyhvKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIG0gPSBvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSwgaTtcclxuICAgIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIGQsIHYpIHsgUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZnVuY3Rpb24odikgeyByZXNvbHZlKHsgdmFsdWU6IHYsIGRvbmU6IGQgfSk7IH0sIHJlamVjdCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWFrZVRlbXBsYXRlT2JqZWN0KGNvb2tlZCwgcmF3KSB7XHJcbiAgICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxyXG4gICAgcmV0dXJuIGNvb2tlZDtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIHJlc3VsdFtrXSA9IG1vZFtrXTtcclxuICAgIHJlc3VsdC5kZWZhdWx0ID0gbW9kO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuIiwiaW1wb3J0IHsgUG9wdXBDb25maWdPcHRpb25zIH0gZnJvbSAnLi9nbG9iYWwnO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfQVVUSE9SSVpFX1RJTUVPVVRfSU5fU0VDT05EUyA9IDYwO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUE9QVVBfQ09ORklHX09QVElPTlM6IFBvcHVwQ29uZmlnT3B0aW9ucyA9IHtcbiAgdGltZW91dEluU2Vjb25kczogREVGQVVMVF9BVVRIT1JJWkVfVElNRU9VVF9JTl9TRUNPTkRTXG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0lMRU5UX1RPS0VOX1JFVFJZX0NPVU5UID0gMztcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjb25zdCBDTEVBTlVQX0lGUkFNRV9USU1FT1VUX0lOX1NFQ09ORFMgPSAyO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfRkVUQ0hfVElNRU9VVF9NUyA9IDEwMDAwO1xuXG5leHBvcnQgY29uc3QgQ0FDSEVfTE9DQVRJT05fTUVNT1JZID0gJ21lbW9yeSc7XG5leHBvcnQgY29uc3QgQ0FDSEVfTE9DQVRJT05fTE9DQUxfU1RPUkFHRSA9ICdsb2NhbHN0b3JhZ2UnO1xuZXhwb3J0IGNvbnN0IE1JU1NJTkdfUkVGUkVTSF9UT0tFTl9FUlJPUl9NRVNTQUdFID1cbiAgJ1RoZSB3ZWIgd29ya2VyIGlzIG1pc3NpbmcgdGhlIHJlZnJlc2ggdG9rZW4nO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0NPUEUgPSAnb3BlbmlkIHByb2ZpbGUgZW1haWwnO1xuXG4vKipcbiAqIEEgbGlzdCBvZiBlcnJvcnMgdGhhdCBjYW4gYmUgaXNzdWVkIGJ5IHRoZSBhdXRob3JpemF0aW9uIHNlcnZlciB3aGljaCB0aGVcbiAqIHVzZXIgY2FuIHJlY292ZXIgZnJvbSBieSBzaWduaW5nIGluIGludGVyYWN0aXZlbHkuXG4gKiBodHRwczovL29wZW5pZC5uZXQvc3BlY3Mvb3BlbmlkLWNvbm5lY3QtY29yZS0xXzAuaHRtbCNBdXRoRXJyb3JcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IFJFQ09WRVJBQkxFX0VSUk9SUyA9IFtcbiAgJ2xvZ2luX3JlcXVpcmVkJyxcbiAgJ2NvbnNlbnRfcmVxdWlyZWQnLFxuICAnaW50ZXJhY3Rpb25fcmVxdWlyZWQnLFxuICAnYWNjb3VudF9zZWxlY3Rpb25fcmVxdWlyZWQnLFxuICAvLyBTdHJpY3RseSBzcGVha2luZyB0aGUgdXNlciBjYW4ndCByZWNvdmVyIGZyb20gYGFjY2Vzc19kZW5pZWRgIC0gYnV0IHRoZXlcbiAgLy8gY2FuIGdldCBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZWlyIGFjY2VzcyBiZWluZyBkZW5pZWQgYnkgbG9nZ2luZyBpblxuICAvLyBpbnRlcmFjdGl2ZWx5LlxuICAnYWNjZXNzX2RlbmllZCdcbl07XG4iLCJpbXBvcnQgeyBNSVNTSU5HX1JFRlJFU0hfVE9LRU5fRVJST1JfTUVTU0FHRSB9IGZyb20gJy4vY29uc3RhbnRzJztcblxubGV0IHJlZnJlc2hUb2tlbnMgPSB7fTtcblxuY29uc3QgY2FjaGVLZXkgPSAoYXVkaWVuY2UsIHNjb3BlKSA9PiBgJHthdWRpZW5jZX18JHtzY29wZX1gO1xuXG5jb25zdCBnZXRSZWZyZXNoVG9rZW4gPSAoYXVkaWVuY2UsIHNjb3BlKSA9PlxuICByZWZyZXNoVG9rZW5zW2NhY2hlS2V5KGF1ZGllbmNlLCBzY29wZSldO1xuXG5jb25zdCBzZXRSZWZyZXNoVG9rZW4gPSAocmVmcmVzaFRva2VuLCBhdWRpZW5jZSwgc2NvcGUpID0+XG4gIChyZWZyZXNoVG9rZW5zW2NhY2hlS2V5KGF1ZGllbmNlLCBzY29wZSldID0gcmVmcmVzaFRva2VuKTtcblxuY29uc3QgZGVsZXRlUmVmcmVzaFRva2VuID0gKGF1ZGllbmNlLCBzY29wZSkgPT5cbiAgZGVsZXRlIHJlZnJlc2hUb2tlbnNbY2FjaGVLZXkoYXVkaWVuY2UsIHNjb3BlKV07XG5cbmNvbnN0IHdhaXQ6IGFueSA9IHRpbWUgPT4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHRpbWUpKTtcblxuY29uc3QgbWVzc2FnZUhhbmRsZXIgPSBhc3luYyAoe1xuICBkYXRhOiB7IHVybCwgdGltZW91dCwgYXVkaWVuY2UsIHNjb3BlLCAuLi5vcHRzIH0sXG4gIHBvcnRzOiBbcG9ydF1cbn0pID0+IHtcbiAgbGV0IGpzb247XG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2Uob3B0cy5ib2R5KTtcbiAgICBpZiAoIWJvZHkucmVmcmVzaF90b2tlbiAmJiBib2R5LmdyYW50X3R5cGUgPT09ICdyZWZyZXNoX3Rva2VuJykge1xuICAgICAgY29uc3QgcmVmcmVzaFRva2VuID0gZ2V0UmVmcmVzaFRva2VuKGF1ZGllbmNlLCBzY29wZSk7XG4gICAgICBpZiAoIXJlZnJlc2hUb2tlbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoTUlTU0lOR19SRUZSRVNIX1RPS0VOX0VSUk9SX01FU1NBR0UpO1xuICAgICAgfVxuICAgICAgb3B0cy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoeyAuLi5ib2R5LCByZWZyZXNoX3Rva2VuOiByZWZyZXNoVG9rZW4gfSk7XG4gICAgfVxuXG4gICAgY29uc3QgYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IHsgc2lnbmFsIH0gPSBhYm9ydENvbnRyb2xsZXI7XG5cbiAgICBsZXQgcmVzcG9uc2U7XG4gICAgdHJ5IHtcbiAgICAgIHJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgd2FpdCh0aW1lb3V0KSxcbiAgICAgICAgZmV0Y2godXJsLCB7IC4uLm9wdHMsIHNpZ25hbCB9KVxuICAgICAgXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIGZldGNoIGVycm9yLCByZWplY3QgYHNlbmRNZXNzYWdlYCB1c2luZyBgZXJyb3JgIGtleSBzbyB0aGF0IHdlIHJldHJ5LlxuICAgICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXJlc3BvbnNlKSB7XG4gICAgICAvLyBJZiB0aGUgcmVxdWVzdCB0aW1lcyBvdXQsIGFib3J0IGl0IGFuZCBsZXQgYGZldGNoV2l0aFRpbWVvdXRgIHJhaXNlIHRoZSBlcnJvci5cbiAgICAgIGFib3J0Q29udHJvbGxlci5hYm9ydCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG5cbiAgICBpZiAoanNvbi5yZWZyZXNoX3Rva2VuKSB7XG4gICAgICBzZXRSZWZyZXNoVG9rZW4oanNvbi5yZWZyZXNoX3Rva2VuLCBhdWRpZW5jZSwgc2NvcGUpO1xuICAgICAgZGVsZXRlIGpzb24ucmVmcmVzaF90b2tlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlUmVmcmVzaFRva2VuKGF1ZGllbmNlLCBzY29wZSk7XG4gICAgfVxuXG4gICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICBvazogcmVzcG9uc2Uub2ssXG4gICAgICBqc29uXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBqc29uOiB7XG4gICAgICAgIGVycm9yX2Rlc2NyaXB0aW9uOiBlcnJvci5tZXNzYWdlXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbi8vIERvbid0IHJ1biBgYWRkRXZlbnRMaXN0ZW5lcmAgaW4gb3VyIHRlc3RzICh0aGlzIGlzIHJlcGxhY2VkIGluIHJvbGx1cClcbi8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAndGVzdCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSB7IG1lc3NhZ2VIYW5kbGVyIH07XG59IGVsc2Uge1xuICAvLyBAdHMtaWdub3JlXG4gIGFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBtZXNzYWdlSGFuZGxlcik7XG59XG4iXSwibmFtZXMiOlsiX19hc3NpZ24iLCJPYmplY3QiLCJhc3NpZ24iLCJ0IiwicyIsImkiLCJuIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwicCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsImFwcGx5IiwidGhpcyIsIl9fZ2VuZXJhdG9yIiwidGhpc0FyZyIsImJvZHkiLCJmIiwieSIsImciLCJfIiwibGFiZWwiLCJzZW50IiwidHJ5cyIsIm9wcyIsIm5leHQiLCJ2ZXJiIiwidGhyb3ciLCJyZXR1cm4iLCJTeW1ib2wiLCJpdGVyYXRvciIsInYiLCJvcCIsIlR5cGVFcnJvciIsImRvbmUiLCJ2YWx1ZSIsInBvcCIsInB1c2giLCJlIiwic3RlcCIsInJlZnJlc2hUb2tlbnMiLCJjYWNoZUtleSIsImF1ZGllbmNlIiwic2NvcGUiLCJhZGRFdmVudExpc3RlbmVyIiwiX2EiLCJfYXJndW1lbnRzIiwiUCIsImdlbmVyYXRvciIsIl9iIiwidXJsIiwidGltZW91dCIsIm9wdHMiLCJpbmRleE9mIiwiZ2V0T3duUHJvcGVydHlTeW1ib2xzIiwicHJvcGVydHlJc0VudW1lcmFibGUiLCJwb3J0IiwiSlNPTiIsInBhcnNlIiwicmVmcmVzaF90b2tlbiIsImdyYW50X3R5cGUiLCJyZWZyZXNoVG9rZW4iLCJnZXRSZWZyZXNoVG9rZW4iLCJFcnJvciIsInN0cmluZ2lmeSIsImFib3J0Q29udHJvbGxlciIsIkFib3J0Q29udHJvbGxlciIsInNpZ25hbCIsInJlc3BvbnNlIiwiUHJvbWlzZSIsInJhY2UiLCJ0aW1lIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJmZXRjaCIsIl9jIiwicG9zdE1lc3NhZ2UiLCJlcnJvciIsImVycm9yXzEiLCJtZXNzYWdlIiwianNvbiIsImFib3J0Iiwic2V0UmVmcmVzaFRva2VuIiwiZGVsZXRlUmVmcmVzaFRva2VuIiwib2siLCJlcnJvcl9kZXNjcmlwdGlvbiIsImVycm9yXzIiLCJyZWplY3QiLCJmdWxmaWxsZWQiLCJyZWplY3RlZCIsInJlc3VsdCIsInRoZW4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBNkJPLElBQUlBLEVBQVcsV0FRbEIsT0FQQUEsRUFBV0MsT0FBT0MsUUFBVSxTQUFrQkMsR0FDMUMsSUFBSyxJQUFJQyxFQUFHQyxFQUFJLEVBQUdDLEVBQUlDLFVBQVVDLE9BQVFILEVBQUlDLEVBQUdELElBRTVDLElBQUssSUFBSUksS0FEVEwsRUFBSUcsVUFBVUYsR0FDT0osT0FBT1MsVUFBVUMsZUFBZUMsS0FBS1IsRUFBR0ssS0FBSU4sRUFBRU0sR0FBS0wsRUFBRUssSUFFOUUsT0FBT04sSUFFS1UsTUFBTUMsS0FBTVAsWUF1Q3pCLFNBQVNRLEVBQVlDLEVBQVNDLEdBQ2pDLElBQXNHQyxFQUFHQyxFQUFHaEIsRUFBR2lCLEVBQTNHQyxFQUFJLENBQUVDLE1BQU8sRUFBR0MsS0FBTSxXQUFhLEdBQVcsRUFBUHBCLEVBQUUsR0FBUSxNQUFNQSxFQUFFLEdBQUksT0FBT0EsRUFBRSxJQUFPcUIsS0FBTSxHQUFJQyxJQUFLLElBQ2hHLE9BQU9MLEVBQUksQ0FBRU0sS0FBTUMsRUFBSyxHQUFJQyxNQUFTRCxFQUFLLEdBQUlFLE9BQVVGLEVBQUssSUFBd0IsbUJBQVhHLFNBQTBCVixFQUFFVSxPQUFPQyxVQUFZLFdBQWEsT0FBT2pCLE9BQVVNLEVBQ3ZKLFNBQVNPLEVBQUtyQixHQUFLLE9BQU8sU0FBVTBCLEdBQUssT0FDekMsU0FBY0MsR0FDVixHQUFJZixFQUFHLE1BQU0sSUFBSWdCLFVBQVUsbUNBQzNCLEtBQU9iLE9BQ0gsR0FBSUgsRUFBSSxFQUFHQyxJQUFNaEIsRUFBWSxFQUFSOEIsRUFBRyxHQUFTZCxFQUFVLE9BQUljLEVBQUcsR0FBS2QsRUFBUyxTQUFPaEIsRUFBSWdCLEVBQVUsU0FBTWhCLEVBQUVTLEtBQUtPLEdBQUksR0FBS0EsRUFBRU8sU0FBV3ZCLEVBQUlBLEVBQUVTLEtBQUtPLEVBQUdjLEVBQUcsS0FBS0UsS0FBTSxPQUFPaEMsRUFFM0osT0FESWdCLEVBQUksRUFBR2hCLElBQUc4QixFQUFLLENBQVMsRUFBUkEsRUFBRyxHQUFROUIsRUFBRWlDLFFBQ3pCSCxFQUFHLElBQ1AsS0FBSyxFQUFHLEtBQUssRUFBRzlCLEVBQUk4QixFQUFJLE1BQ3hCLEtBQUssRUFBYyxPQUFYWixFQUFFQyxRQUFnQixDQUFFYyxNQUFPSCxFQUFHLEdBQUlFLE1BQU0sR0FDaEQsS0FBSyxFQUFHZCxFQUFFQyxRQUFTSCxFQUFJYyxFQUFHLEdBQUlBLEVBQUssQ0FBQyxHQUFJLFNBQ3hDLEtBQUssRUFBR0EsRUFBS1osRUFBRUksSUFBSVksTUFBT2hCLEVBQUVHLEtBQUthLE1BQU8sU0FDeEMsUUFDSSxLQUFNbEMsRUFBSWtCLEVBQUVHLE1BQU1yQixFQUFJQSxFQUFFSyxPQUFTLEdBQUtMLEVBQUVBLEVBQUVLLE9BQVMsS0FBa0IsSUFBVnlCLEVBQUcsSUFBc0IsSUFBVkEsRUFBRyxJQUFXLENBQUVaLEVBQUksRUFBRyxTQUNqRyxHQUFjLElBQVZZLEVBQUcsTUFBYzlCLEdBQU04QixFQUFHLEdBQUs5QixFQUFFLElBQU04QixFQUFHLEdBQUs5QixFQUFFLElBQU0sQ0FBRWtCLEVBQUVDLE1BQVFXLEVBQUcsR0FBSSxNQUM5RSxHQUFjLElBQVZBLEVBQUcsSUFBWVosRUFBRUMsTUFBUW5CLEVBQUUsR0FBSSxDQUFFa0IsRUFBRUMsTUFBUW5CLEVBQUUsR0FBSUEsRUFBSThCLEVBQUksTUFDN0QsR0FBSTlCLEdBQUtrQixFQUFFQyxNQUFRbkIsRUFBRSxHQUFJLENBQUVrQixFQUFFQyxNQUFRbkIsRUFBRSxHQUFJa0IsRUFBRUksSUFBSWEsS0FBS0wsR0FBSyxNQUN2RDlCLEVBQUUsSUFBSWtCLEVBQUVJLElBQUlZLE1BQ2hCaEIsRUFBRUcsS0FBS2EsTUFBTyxTQUV0QkosRUFBS2hCLEVBQUtMLEtBQUtJLEVBQVNLLEdBQzFCLE1BQU9rQixHQUFLTixFQUFLLENBQUMsRUFBR00sR0FBSXBCLEVBQUksVUFBZUQsRUFBSWYsRUFBSSxFQUN0RCxHQUFZLEVBQVI4QixFQUFHLEdBQVEsTUFBTUEsRUFBRyxHQUFJLE1BQU8sQ0FBRUcsTUFBT0gsRUFBRyxHQUFLQSxFQUFHLFFBQUssRUFBUUUsTUFBTSxHQXJCOUJLLENBQUssQ0FBQ2xDLEVBQUcwQixNQ2hEdEQsSUM3QkhTLEVBQWdCLEdBRWRDLEVBQVcsU0FBQ0MsRUFBVUMsR0FBVSxPQUFHRCxNQUFZQyxHQWdGbkRDLGlCQUFpQixXQW5FSSxTQUFPQyxxQkZrREo5QixFQUFTK0IsRUFBWUMsRUFBR0MsU0FBeEJqQyxTQUFTK0IsU0FBZUUsbUZFakRoREMsU0FBUUMsUUFBS0MsWUFBU1QsYUFBVUMsVUFBVVMsRUZzQnJDLFNBQWdCakQsRUFBR21DLEdBQ3RCLElBQUlwQyxFQUFJLEdBQ1IsSUFBSyxJQUFJTSxLQUFLTCxFQUFPSCxPQUFPUyxVQUFVQyxlQUFlQyxLQUFLUixFQUFHSyxJQUFNOEIsRUFBRWUsUUFBUTdDLEdBQUssSUFDOUVOLEVBQUVNLEdBQUtMLEVBQUVLLElBQ2IsR0FBUyxNQUFMTCxHQUFxRCxtQkFBakNILE9BQU9zRCxzQkFDdEIsQ0FBQSxJQUFJbEQsRUFBSSxFQUFiLElBQWdCSSxFQUFJUixPQUFPc0Qsc0JBQXNCbkQsR0FBSUMsRUFBSUksRUFBRUQsT0FBUUgsSUFDM0RrQyxFQUFFZSxRQUFRN0MsRUFBRUosSUFBTSxHQUFLSixPQUFPUyxVQUFVOEMscUJBQXFCNUMsS0FBS1IsRUFBR0ssRUFBRUosTUFDdkVGLEVBQUVNLEVBQUVKLElBQU1ELEVBQUVLLEVBQUVKLEtBRTFCLE9BQU9GLEtFL0JILHNDQUNFc0QsOEJBS04sMkJBRE14QyxFQUFPeUMsS0FBS0MsTUFBTU4sRUFBS3BDLE9BQ25CMkMsZUFBcUMsa0JBQXBCM0MsRUFBSzRDLFdBQWdDLENBRTlELEtBRE1DLEVBbkJZLFNBQUNuQixFQUFVQyxHQUNqQyxPQUFBSCxFQUFjQyxFQUFTQyxFQUFVQyxJQWtCUm1CLENBQWdCcEIsRUFBVUMsSUFFN0MsTUFBTSxJQUFJb0IsTURLaEIsK0NDSElYLEVBQUtwQyxLQUFPeUMsS0FBS08saUJBQWVoRCxJQUFNMkMsY0FBZUUsS0FHakRJLEVBQWtCLElBQUlDLGdCQUNwQkMsRUFBV0YsU0FFZkcsMEJBRVMsZ0NBQU1DLFFBQVFDLEtBQUssRUF0QmxCQyxFQXVCTHBCLEVBdkJhLElBQUlrQixTQUFRLFNBQUFHLEdBQVcsT0FBQUMsV0FBV0QsRUFBU0QsT0F3QjdERyxNQUFNeEIsU0FBVUUsSUFBTWUsNkJBRnhCQyxFQUFXTyxzQkFTWCxrQkFIQW5CLEVBQUtvQixZQUFZLENBQ2ZDLE1BQU9DLEVBQU1DLHFCQUtqQixPQUFLWCxLQU1RQSxFQUFTWSxTQUpwQmYsRUFBZ0JnQiwyQkFJbEJELEVBQU9MLFVBRUVoQixlQWhEVyxTQUFDRSxFQUFjbkIsRUFBVUMsR0FDOUNILEVBQWNDLEVBQVNDLEVBQVVDLElBQVVrQixFQWdEeENxQixDQUFnQkYsRUFBS3JCLGNBQWVqQixFQUFVQyxVQUN2Q3FDLEVBQUtyQixlQS9DUyxTQUFDakIsRUFBVUMsVUFDN0JILEVBQWNDLEVBQVNDLEVBQVVDLElBZ0RwQ3dDLENBQW1CekMsRUFBVUMsR0FHL0JhLEVBQUtvQixZQUFZLENBQ2ZRLEdBQUloQixFQUFTZ0IsR0FDYkosd0NBR0Z4QixFQUFLb0IsWUFBWSxDQUNmUSxJQUFJLEVBQ0pKLEtBQU0sQ0FDSkssa0JBQW1CQyxFQUFNUCxrQ0F6RGYsSUFBQVIsTUZxRFAsS0FEb0N4QixZQUN6QkEsRUFBSXNCLFdBQVUsU0FBVUcsRUFBU2UsR0FDL0MsU0FBU0MsRUFBVXJELEdBQVMsSUFBTUksRUFBS1MsRUFBVXZCLEtBQUtVLElBQVcsTUFBT0csR0FBS2lELEVBQU9qRCxJQUNwRixTQUFTbUQsRUFBU3RELEdBQVMsSUFBTUksRUFBS1MsRUFBaUIsTUFBRWIsSUFBVyxNQUFPRyxHQUFLaUQsRUFBT2pELElBQ3ZGLFNBQVNDLEVBQUttRCxHQUFVQSxFQUFPeEQsS0FBT3NDLEVBQVFrQixFQUFPdkQsT0FBUyxJQUFJWSxHQUFFLFNBQVV5QixHQUFXQSxFQUFRa0IsRUFBT3ZELFVBQVd3RCxLQUFLSCxFQUFXQyxHQUNuSWxELEdBQU1TLEVBQVlBLEVBQVVwQyxNQUFNRyxFQUFTK0IsR0FBYyxLQUFLckIifQ==",ir=!1,function(e){return rr=rr||er(tr,nr,ir),new Worker(rr,e)}),cr=new hi,sr={memory:function(){return (new Ti).enclosedCache},localstorage:function(){return new Yi}},ar=function(e){return sr[e]},ur=function(){function e(e){var t,n,r,o;if(this.options=e,"undefined"!=typeof window&&function(){if(!Si())throw new Error("For security reasons, `window.crypto` is required to run `auth0-spa-js`.");if(void 0===Vi())throw new Error("\n      auth0-spa-js must run on a secure origin.\n      See https://github.com/auth0/auth0-spa-js/blob/master/FAQ.md#why-do-i-get-auth0-spa-js-must-run-on-a-secure-origin \n      for more information.\n    ")}(),this.cacheLocation=e.cacheLocation||"memory",this.cookieStorage=!1===e.legacySameSiteCookie?Mi:qi,!ar(this.cacheLocation))throw new Error('Invalid cache location "'+this.cacheLocation+'"');this.cache=ar(this.cacheLocation)(),this.scope=this.options.scope,this.transactionManager=new Ki($i),this.domainUrl="https://"+this.options.domain,this.tokenIssuer=(r=this.options.issuer,o=this.domainUrl,r?r.startsWith("https://")?r:"https://"+r+"/":o+"/"),this.defaultScope=Ji("openid",void 0!==(null===(n=null===(t=this.options)||void 0===t?void 0:t.advancedOptions)||void 0===n?void 0:n.defaultScope)?this.options.advancedOptions.defaultScope:"openid profile email"),this.options.useRefreshTokens&&(this.scope=Ji(this.scope,"offline_access")),"undefined"!=typeof window&&window.Worker&&this.options.useRefreshTokens&&"memory"===this.cacheLocation&&!/Trident.*rv:11\.0/.test(navigator.userAgent)&&(this.worker=new or),this.customOptions=function(e){return e.advancedOptions,e.audience,e.auth0Client,e.authorizeTimeoutInSeconds,e.cacheLocation,e.client_id,e.domain,e.issuer,e.leeway,e.max_age,e.redirect_uri,e.scope,e.useRefreshTokens,i(e,["advancedOptions","audience","auth0Client","authorizeTimeoutInSeconds","cacheLocation","client_id","domain","issuer","leeway","max_age","redirect_uri","scope","useRefreshTokens"])}(e);}return e.prototype._url=function(e){var t=encodeURIComponent(btoa(JSON.stringify(this.options.auth0Client||{name:"auth0-spa-js",version:"1.12.0"})));return ""+this.domainUrl+e+"&auth0Client="+t},e.prototype._getParams=function(e,t,r,o,c){var s=this.options,a=(s.domain,s.leeway,s.useRefreshTokens,s.auth0Client,s.cacheLocation,s.advancedOptions,i(s,["domain","leeway","useRefreshTokens","auth0Client","cacheLocation","advancedOptions"]));return n(n(n({},a),e),{scope:Ji(this.defaultScope,this.scope,e.scope),response_type:"code",response_mode:"query",state:t,nonce:r,redirect_uri:c||this.options.redirect_uri,code_challenge:o,code_challenge_method:"S256"})},e.prototype._authorizeUrl=function(e){return this._url("/authorize?"+Gi(e))},e.prototype._verifyIdToken=function(e,t){return zi({iss:this.tokenIssuer,aud:this.options.client_id,id_token:e,nonce:t,leeway:this.options.leeway,max_age:this._parseNumber(this.options.max_age)})},e.prototype._parseNumber=function(e){return "string"!=typeof e?e:parseInt(e,10)||void 0},e.prototype.buildAuthorizeUrl=function(e){return void 0===e&&(e={}),r(this,void 0,void 0,(function(){var t,n,r,c,s,a,u,l,d,g,I;return o(this,(function(o){switch(o.label){case 0:return t=e.redirect_uri,n=e.appState,r=i(e,["redirect_uri","appState"]),c=Xi(Zi()),s=Xi(Zi()),a=Zi(),[4,wi(a)];case 1:return u=o.sent(),l=xi(u),d=e.fragment?"#"+e.fragment:"",g=this._getParams(r,c,s,l,t),I=this._authorizeUrl(g),this.transactionManager.create({nonce:s,code_verifier:a,appState:n,scope:g.scope,audience:g.audience||"default",redirect_uri:g.redirect_uri}),[2,I+d]}}))}))},e.prototype.loginWithPopup=function(e,t){return void 0===e&&(e={}),void 0===t&&(t={}),r(this,void 0,void 0,(function(){var r,c,s,a,u,l,d,g,I,f,p,h;return o(this,(function(o){switch(o.label){case 0:return r=i(e,[]),c=Xi(Zi()),s=Xi(Zi()),a=Zi(),[4,wi(a)];case 1:return u=o.sent(),l=xi(u),d=this._getParams(r,c,s,l,this.options.redirect_uri||window.location.origin),g=this._authorizeUrl(n(n({},d),{response_mode:"web_message"})),[4,Ui(g,n(n({},t),{timeoutInSeconds:t.timeoutInSeconds||this.options.authorizeTimeoutInSeconds||60}))];case 2:if(I=o.sent(),c!==I.state)throw new Error("Invalid state");return [4,Li({audience:d.audience,scope:d.scope,baseUrl:this.domainUrl,client_id:this.options.client_id,code_verifier:a,code:I.code,grant_type:"authorization_code",redirect_uri:d.redirect_uri},this.worker)];case 3:return f=o.sent(),p=this._verifyIdToken(f.id_token,s),h=n(n({},f),{decodedToken:p,scope:d.scope,audience:d.audience||"default",client_id:this.options.client_id}),this.cache.save(h),this.cookieStorage.save("auth0.is.authenticated",!0,{daysUntilExpire:1}),[2]}}))}))},e.prototype.getUser=function(e){return void 0===e&&(e={}),r(this,void 0,void 0,(function(){var t,n,i;return o(this,(function(r){return t=e.audience||this.options.audience||"default",n=Ji(this.defaultScope,this.scope,e.scope),[2,(i=this.cache.get({client_id:this.options.client_id,audience:t,scope:n}))&&i.decodedToken&&i.decodedToken.user]}))}))},e.prototype.getIdTokenClaims=function(e){return void 0===e&&(e={}),r(this,void 0,void 0,(function(){var t,n,i;return o(this,(function(r){return t=e.audience||this.options.audience||"default",n=Ji(this.defaultScope,this.scope,e.scope),[2,(i=this.cache.get({client_id:this.options.client_id,audience:t,scope:n}))&&i.decodedToken&&i.decodedToken.claims]}))}))},e.prototype.loginWithRedirect=function(e){return void 0===e&&(e={}),r(this,void 0,void 0,(function(){var t;return o(this,(function(n){switch(n.label){case 0:return [4,this.buildAuthorizeUrl(e)];case 1:return t=n.sent(),window.location.assign(t),[2]}}))}))},e.prototype.handleRedirectCallback=function(e){return void 0===e&&(e=window.location.href),r(this,void 0,void 0,(function(){var t,i,r,c,s,a,u,l,d,g,I;return o(this,(function(o){switch(o.label){case 0:if(0===(t=e.split("?").slice(1)).length)throw new Error("There are no query params available for parsing.");if(i=function(e){e.indexOf("#")>-1&&(e=e.substr(0,e.indexOf("#")));var t=e.split("&"),i={};return t.forEach((function(e){var t=e.split("="),n=t[0],r=t[1];i[n]=decodeURIComponent(r);})),n(n({},i),{expires_in:parseInt(i.expires_in)})}(t.join("")),r=i.state,c=i.code,s=i.error,a=i.error_description,!(u=this.transactionManager.get())||!u.code_verifier||!u.nonce)throw new Error("Invalid state");if(s)throw this.transactionManager.remove(),new Bi(s,a,r,u.appState);return this.transactionManager.remove(),l={audience:u.audience,scope:u.scope,baseUrl:this.domainUrl,client_id:this.options.client_id,code_verifier:u.code_verifier,grant_type:"authorization_code",code:c},void 0!==u.redirect_uri&&(l.redirect_uri=u.redirect_uri),[4,Li(l,this.worker)];case 1:return d=o.sent(),g=this._verifyIdToken(d.id_token,u.nonce),I=n(n({},d),{decodedToken:g,audience:u.audience,scope:u.scope,client_id:this.options.client_id}),this.cache.save(I),this.cookieStorage.save("auth0.is.authenticated",!0,{daysUntilExpire:1}),[2,{appState:u.appState}]}}))}))},e.prototype.checkSession=function(e){return r(this,void 0,void 0,(function(){var t;return o(this,(function(n){switch(n.label){case 0:if("memory"===this.cacheLocation&&!this.cookieStorage.get("auth0.is.authenticated"))return [2];n.label=1;case 1:return n.trys.push([1,3,,4]),[4,this.getTokenSilently(e)];case 2:return n.sent(),[3,4];case 3:if(t=n.sent(),!bi.includes(t.error))throw t;return [3,4];case 4:return [2]}}))}))},e.prototype.getTokenSilently=function(e){return void 0===e&&(e={}),r(this,void 0,void 0,(function(){var t,r,c,s,a,u,l,d=this;return o(this,(function(o){switch(o.label){case 0:if(t=n(n({audience:this.options.audience,ignoreCache:!1},e),{scope:Ji(this.defaultScope,this.scope,e.scope)}),r=t.ignoreCache,c=i(t,["ignoreCache"]),s=function(){var e=d.cache.get({scope:c.scope,audience:c.audience||"default",client_id:d.options.client_id},60);return e&&e.access_token},!r&&(a=s()))return [2,a];o.label=1;case 1:return o.trys.push([1,7,8,10]),[4,cr.acquireLock("auth0.lock.getTokenSilently",5e3)];case 2:return o.sent(),!r&&(a=s())?[2,a]:this.options.useRefreshTokens?[4,this._getTokenUsingRefreshToken(c)]:[3,4];case 3:return l=o.sent(),[3,6];case 4:return [4,this._getTokenFromIFrame(c)];case 5:l=o.sent(),o.label=6;case 6:return u=l,this.cache.save(n({client_id:this.options.client_id},u)),this.cookieStorage.save("auth0.is.authenticated",!0,{daysUntilExpire:1}),[2,u.access_token];case 7:throw o.sent();case 8:return [4,cr.releaseLock("auth0.lock.getTokenSilently")];case 9:return o.sent(),[7];case 10:return [2]}}))}))},e.prototype.getTokenWithPopup=function(e,t){return void 0===e&&(e={}),void 0===t&&(t={}),r(this,void 0,void 0,(function(){return o(this,(function(i){switch(i.label){case 0:return e.audience=e.audience||this.options.audience,e.scope=Ji(this.defaultScope,this.scope,e.scope),t=n(n({},yi),t),[4,this.loginWithPopup(e,t)];case 1:return i.sent(),[2,this.cache.get({scope:e.scope,audience:e.audience||"default",client_id:this.options.client_id}).access_token]}}))}))},e.prototype.isAuthenticated=function(){return r(this,void 0,void 0,(function(){return o(this,(function(e){switch(e.label){case 0:return [4,this.getUser()];case 1:return [2,!!e.sent()]}}))}))},e.prototype.logout=function(e){void 0===e&&(e={}),null!==e.client_id?e.client_id=e.client_id||this.options.client_id:delete e.client_id;var t=e.federated,n=e.localOnly,r=i(e,["federated","localOnly"]);if(n&&t)throw new Error("It is invalid to set both the `federated` and `localOnly` options to `true`");if(this.cache.clear(),this.cookieStorage.remove("auth0.is.authenticated"),!n){var o=t?"&federated":"",c=this._url("/v2/logout?"+Gi(r));window.location.assign(""+c+o);}},e.prototype._getTokenFromIFrame=function(e){return r(this,void 0,void 0,(function(){var t,r,c,s,a,u,l,d,g,I,f,p,h,y;return o(this,(function(o){switch(o.label){case 0:return t=Xi(Zi()),r=Xi(Zi()),c=Zi(),[4,wi(c)];case 1:return s=o.sent(),a=xi(s),u=this._getParams(e,t,r,a,e.redirect_uri||this.options.redirect_uri||window.location.origin),l=this._authorizeUrl(n(n({},u),{prompt:"none",response_mode:"web_message"})),d=e.timeoutInSeconds||this.options.authorizeTimeoutInSeconds,[4,Ci(l,this.domainUrl,d)];case 2:if(g=o.sent(),t!==g.state)throw new Error("Invalid state");return I=e.scope,f=e.audience,e.redirect_uri,e.ignoreCache,e.timeoutInSeconds,p=i(e,["scope","audience","redirect_uri","ignoreCache","timeoutInSeconds"]),[4,Li(n(n(n({},this.customOptions),p),{scope:I,audience:f,baseUrl:this.domainUrl,client_id:this.options.client_id,code_verifier:c,code:g.code,grant_type:"authorization_code",redirect_uri:u.redirect_uri}),this.worker)];case 3:return h=o.sent(),y=this._verifyIdToken(h.id_token,r),[2,n(n({},h),{decodedToken:y,scope:u.scope,audience:u.audience||"default"})]}}))}))},e.prototype._getTokenUsingRefreshToken=function(e){return r(this,void 0,void 0,(function(){var t,r,c,s,a,u,l,d;return o(this,(function(o){switch(o.label){case 0:return e.scope=Ji(this.defaultScope,this.options.scope,e.scope),(t=this.cache.get({scope:e.scope,audience:e.audience||"default",client_id:this.options.client_id}))&&t.refresh_token||this.worker?[3,2]:[4,this._getTokenFromIFrame(e)];case 1:return [2,o.sent()];case 2:r=e.redirect_uri||this.options.redirect_uri||window.location.origin,s=e.scope,a=e.audience,e.ignoreCache,e.timeoutInSeconds,u=i(e,["scope","audience","ignoreCache","timeoutInSeconds"]),o.label=3;case 3:return o.trys.push([3,5,,8]),[4,Li(n(n(n({},this.customOptions),u),{audience:a,scope:s,baseUrl:this.domainUrl,client_id:this.options.client_id,grant_type:"refresh_token",refresh_token:t&&t.refresh_token,redirect_uri:r}),this.worker)];case 4:return c=o.sent(),[3,8];case 5:return "The web worker is missing the refresh token"!==(l=o.sent()).message?[3,7]:[4,this._getTokenFromIFrame(e)];case 6:return [2,o.sent()];case 7:throw l;case 8:return d=this._verifyIdToken(c.id_token),[2,n(n({},c),{decodedToken:d,scope:e.scope,audience:e.audience||"default"})]}}))}))},e}();function createAuth0Client(e){return r(this,void 0,void 0,(function(){var t;return o(this,(function(n){switch(n.label){case 0:return [4,(t=new ur(e)).checkSession()];case 1:return n.sent(),[2,t]}}))}))}

    // src/auth0-config.js
    const auth0Config = {
        audience: 'https://dev-27xyeipl.us.auth0.com/api/v2/',
        domain: 'dev-27xyeipl.us.auth0.com',
        client_id: 'bVX7OCO8KIeZdBgTsZRRDNSn6P0JXkxy',
        cacheLocation: 'localstorage',
      };

    /* src/views/admin/AdminLayout.svelte generated by Svelte v3.46.4 */

    const { console: console_1 } = globals;
    const file$2 = "src/views/admin/AdminLayout.svelte";

    // (40:4) {#if initialized}
    function create_if_block(ctx) {
    	let button;
    	let t1;
    	let route;
    	let current;
    	let mounted;
    	let dispose;

    	route = new Route({
    			props: { currentRoute: /*currentRoute*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Logout";
    			t1 = space();
    			create_component(route.$$.fragment);
    			attr_dev(button, "class", "button is-light is-small");
    			set_style(button, "float", "right");
    			add_location(button, file$2, 40, 8, 1089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const route_changes = {};
    			if (dirty & /*currentRoute*/ 1) route_changes.currentRoute = /*currentRoute*/ ctx[0];
    			route.$set(route_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			destroy_component(route, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:4) {#if initialized}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let current;
    	let if_block = /*initialized*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			add_location(div, file$2, 38, 0, 1053);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*initialized*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*initialized*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AdminLayout', slots, []);
    	let { currentRoute } = $$props;
    	let auth0;
    	let initialized = false;
    	console.log(`${window.location.origin}/callback`);

    	onMount(async () => {
    		auth0 = await createAuth0Client(auth0Config);
    		const authenticated = await auth0.isAuthenticated();

    		if (!authenticated) {
    			await auth0.loginWithRedirect({
    				redirect_uri: `${window.location.origin}/callback`,
    				appState: window.location.pathname
    			});
    		} else {
    			user.set({
    				name: "Test User",
    				schoolName: "Test School"
    			});

    			$$invalidate(1, initialized = true);
    		}
    	});

    	const logout = async () => {
    		auth0.logout({ returnTo: window.location.origin });
    	};

    	const writable_props = ['currentRoute'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<AdminLayout> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => logout();

    	$$self.$$set = $$props => {
    		if ('currentRoute' in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	$$self.$capture_state = () => ({
    		Route,
    		onMount,
    		user,
    		createAuth0Client,
    		auth0Config,
    		currentRoute,
    		auth0,
    		initialized,
    		logout
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentRoute' in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    		if ('auth0' in $$props) auth0 = $$props.auth0;
    		if ('initialized' in $$props) $$invalidate(1, initialized = $$props.initialized);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentRoute, initialized, logout, click_handler];
    }

    class AdminLayout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { currentRoute: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AdminLayout",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*currentRoute*/ ctx[0] === undefined && !('currentRoute' in props)) {
    			console_1.warn("<AdminLayout> was created without expected prop 'currentRoute'");
    		}
    	}

    	get currentRoute() {
    		throw new Error("<AdminLayout>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentRoute(value) {
    		throw new Error("<AdminLayout>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/views/admin/Callback.svelte generated by Svelte v3.46.4 */
    const file$1 = "src/views/admin/Callback.svelte";

    function create_fragment$1(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Redirecting...Please wait";
    			add_location(h1, file$1, 18, 2, 586);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Callback', slots, []);

    	onMount(async () => {
    		const auth0 = await createAuth0Client(auth0Config);
    		const result = await auth0.handleRedirectCallback();
    		const redirectPath = result.appState;

    		// Redirect the user to the path they were going to prior to the auth0 login sequence
    		if (redirectPath) {
    			window.history.replaceState(null, null, redirectPath);
    			window.location.reload();
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Callback> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, createAuth0Client, auth0Config });
    	return [];
    }

    class Callback extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Callback",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const routes = [
        { name: '/', component: Home },
        { name: '/lunch-menu', component: LunchMenuView },
        { name: '/callback', component: Callback },
        {
            name: '/admin/manage-menus',
            component: AdminLayout,
            nestedRoutes: [
                { name: 'index', component: LunchMenuAdmin },
                { name: 'week-details/:lunchWeekId', component: LunchMenuAdminDetails }
            ]
        }
    ];

    /* src/App.svelte generated by Svelte v3.46.4 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let section;
    	let div;
    	let router;
    	let current;
    	router = new Router({ props: { routes }, $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			section = element("section");
    			div = element("div");
    			create_component(router.$$.fragment);
    			attr_dev(div, "class", "container");
    			add_location(div, file, 7, 2, 140);
    			attr_dev(section, "class", "section");
    			add_location(section, file, 6, 1, 112);
    			add_location(main, file, 5, 0, 104);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, section);
    			append_dev(section, div);
    			mount_component(router, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Router, routes });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
