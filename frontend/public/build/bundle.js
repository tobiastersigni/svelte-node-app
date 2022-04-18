
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
    function create_if_block$3(ctx) {
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
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(6:0) {#if currentRoute.layout}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$3, create_if_block_1$1, create_if_block_2$1];
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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { currentRoute: 0, params: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$d.name
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

    function create_fragment$c(ctx) {
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { routes: 1, options: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$c.name
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
    const file$a = "node_modules/svelte-router-spa/src/components/navigate.svelte";

    function create_fragment$b(ctx) {
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
    			add_location(a, file$a, 26, 0, 560);
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { to: 0, title: 1, styles: 2, lang: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navigate",
    			options,
    			id: create_fragment$b.name
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
    const file$9 = "src/views/public/Home.svelte";

    // (71:12) <Navigate to="/admin/manage-menus">
    function create_default_slot$1(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Log in";
    			attr_dev(button, "class", "button is-small is-text");
    			add_location(button, file$9, 71, 16, 2543);
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

    function create_fragment$a(ctx) {
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
    			add_location(h1, file$9, 14, 16, 353);
    			add_location(p0, file$9, 15, 16, 417);
    			add_location(p1, file$9, 20, 16, 652);
    			attr_dev(div0, "class", "content");
    			add_location(div0, file$9, 13, 12, 315);
    			attr_dev(div1, "class", "column");
    			add_location(div1, file$9, 12, 8, 282);
    			add_location(h3, file$9, 28, 16, 900);
    			attr_dev(label0, "class", "label");
    			attr_dev(label0, "for", "emailAddress");
    			add_location(label0, file$9, 30, 20, 978);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "emailAddress");
    			attr_dev(input0, "placeholder", "Enter your email address");
    			attr_dev(input0, "class", "input");
    			add_location(input0, file$9, 33, 24, 1127);
    			attr_dev(div2, "class", "control");
    			add_location(div2, file$9, 32, 20, 1081);
    			attr_dev(div3, "class", "field");
    			add_location(div3, file$9, 29, 16, 938);
    			attr_dev(label1, "class", "label");
    			attr_dev(label1, "for", "schoolName");
    			add_location(label1, file$9, 43, 20, 1516);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "id", "schoolName");
    			attr_dev(input1, "placeholder", "Enter your school's name");
    			attr_dev(input1, "class", "input");
    			add_location(input1, file$9, 45, 24, 1640);
    			attr_dev(div4, "class", "control");
    			add_location(div4, file$9, 44, 20, 1594);
    			attr_dev(div5, "class", "field");
    			add_location(div5, file$9, 42, 16, 1476);
    			attr_dev(button, "class", "button is-link is-outlined");
    			add_location(button, file$9, 56, 24, 2082);
    			attr_dev(div6, "class", "control");
    			add_location(div6, file$9, 55, 20, 2036);
    			attr_dev(div7, "class", "field is-grouped");
    			add_location(div7, file$9, 54, 16, 1985);
    			attr_dev(div8, "class", "content");
    			add_location(div8, file$9, 27, 12, 862);
    			attr_dev(div9, "class", "column");
    			add_location(div9, file$9, 26, 8, 829);
    			attr_dev(div10, "class", "columns");
    			add_location(div10, file$9, 11, 4, 252);
    			attr_dev(div11, "class", "notification");
    			add_location(div11, file$9, 10, 0, 221);
    			add_location(span, file$9, 69, 12, 2446);
    			add_location(center, file$9, 68, 8, 2425);
    			attr_dev(div12, "class", "content");
    			set_style(div12, "line-height", "30px");
    			add_location(div12, file$9, 67, 4, 2368);
    			attr_dev(div13, "class", "container");
    			add_location(div13, file$9, 66, 0, 2340);
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/views/public/LunchMenuView.svelte generated by Svelte v3.46.4 */

    const file$8 = "src/views/public/LunchMenuView.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let h1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Lunch Menu View";
    			attr_dev(h1, "class", "title");
    			add_location(h1, file$8, 1, 4, 10);
    			add_location(div, file$8, 0, 0, 0);
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
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
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LunchMenuView",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const user = writable();

    /* node_modules/svelte-awesome/components/svg/Path.svelte generated by Svelte v3.46.4 */

    const file$7 = "node_modules/svelte-awesome/components/svg/Path.svelte";

    function create_fragment$8(ctx) {
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
    			add_location(path, file$7, 0, 0, 0);
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
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Path",
    			options,
    			id: create_fragment$8.name
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

    const file$6 = "node_modules/svelte-awesome/components/svg/Polygon.svelte";

    function create_fragment$7(ctx) {
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
    			add_location(polygon, file$6, 0, 0, 0);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Polygon",
    			options,
    			id: create_fragment$7.name
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

    const file$5 = "node_modules/svelte-awesome/components/svg/Raw.svelte";

    function create_fragment$6(ctx) {
    	let g;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			add_location(g, file$5, 0, 0, 0);
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Raw",
    			options,
    			id: create_fragment$6.name
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

    const file$4 = "node_modules/svelte-awesome/components/svg/Svg.svelte";

    function create_fragment$5(ctx) {
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
    			add_location(svg, file$4, 0, 0, 0);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
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
    			id: create_fragment$5.name
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

    const { Object: Object_1, console: console_1$1 } = globals;

    function get_each_context$1(ctx, list, i) {
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
    function create_if_block$2(ctx) {
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
    		id: create_if_block$2.name,
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
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
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
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
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
    function create_each_block$1(ctx) {
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
    		id: create_each_block$1.name,
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
    	let if_block = /*self*/ ctx[6] && create_if_block$2(ctx);

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
    					if_block = create_if_block$2(ctx);
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

    function create_fragment$4(ctx) {
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
    		id: create_fragment$4.name,
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

    function instance$4($$self, $$props, $$invalidate) {
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Icon> was created with unknown prop '${key}'`);
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
    			instance$4,
    			create_fragment$4,
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
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[11] === undefined && !('data' in props)) {
    			console_1$1.warn("<Icon> was created without expected prop 'data'");
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
    function isDate(val) {
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
      isDate: isDate,
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

    const { console: console_1 } = globals;
    const file$3 = "src/views/admin/LunchMenuAdmin.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (112:4) {:else}
    function create_else_block(ctx) {
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
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			add_location(button, file$3, 112, 8, 3447);
    			add_location(th0, file$3, 121, 20, 3697);
    			add_location(th1, file$3, 122, 20, 3734);
    			add_location(th2, file$3, 123, 20, 3773);
    			add_location(tr, file$3, 120, 16, 3672);
    			add_location(thead, file$3, 119, 12, 3648);
    			attr_dev(table, "class", "table");
    			add_location(table, file$3, 118, 8, 3614);
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
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
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
    		id: create_else_block.name,
    		type: "else",
    		source: "(112:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (108:4) {#if loading}
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
    			add_location(div, file$3, 108, 8, 3339);
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
    		source: "(108:4) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (127:12) {#each lunchWeekList as lunchWeek}
    function create_each_block(ctx) {
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
    			add_location(td0, file$3, 128, 20, 3911);
    			add_location(td1, file$3, 133, 20, 4128);
    			attr_dev(td2, "class", "has-text-grey-light clickable svelte-s66s5j");
    			add_location(td2, file$3, 135, 20, 4269);
    			add_location(tr, file$3, 127, 16, 3886);
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
    		id: create_each_block.name,
    		type: "each",
    		source: "(127:12) {#each lunchWeekList as lunchWeek}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
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
    			add_location(a0, file$3, 97, 16, 3033);
    			add_location(li0, file$3, 96, 12, 3012);
    			attr_dev(a1, "href", "/admin/manage-menus");
    			add_location(a1, file$3, 100, 16, 3105);
    			add_location(li1, file$3, 99, 12, 3084);
    			attr_dev(a2, "href", "/#");
    			add_location(a2, file$3, 103, 16, 3234);
    			attr_dev(li2, "class", "is-active");
    			add_location(li2, file$3, 102, 12, 3195);
    			add_location(ul, file$3, 95, 8, 2995);
    			attr_dev(nav, "class", "breadcrumb");
    			attr_dev(nav, "aria-label", "breadcrumbs");
    			add_location(nav, file$3, 94, 4, 2937);
    			add_location(div0, file$3, 93, 0, 2927);
    			attr_dev(div1, "class", "modal-background");
    			add_location(div1, file$3, 149, 4, 4701);
    			attr_dev(p0, "class", "modal-card-title");
    			add_location(p0, file$3, 152, 8, 4814);
    			attr_dev(button0, "class", "delete");
    			attr_dev(button0, "aria-label", "close");
    			add_location(button0, file$3, 153, 8, 4872);
    			attr_dev(header0, "class", "modal-card-head");
    			add_location(header0, file$3, 151, 6, 4773);
    			attr_dev(label, "class", "label");
    			attr_dev(label, "for", "week-of");
    			add_location(label, file$3, 157, 10, 5063);
    			attr_dev(input, "id", "week-of");
    			attr_dev(input, "type", "date");
    			attr_dev(input, "class", "input");
    			attr_dev(input, "placeholder", "yyyy-mm-dd");
    			add_location(input, file$3, 160, 12, 5251);
    			attr_dev(div2, "class", "control");
    			add_location(div2, file$3, 158, 10, 5124);
    			attr_dev(div3, "class", "field");
    			add_location(div3, file$3, 156, 8, 5033);
    			attr_dev(section0, "class", "modal-card-body");
    			add_location(section0, file$3, 155, 6, 4991);
    			attr_dev(button1, "class", "button is-success");
    			add_location(button1, file$3, 165, 8, 5453);
    			attr_dev(button2, "class", "button");
    			add_location(button2, file$3, 166, 8, 5550);
    			attr_dev(footer0, "class", "modal-card-foot");
    			add_location(footer0, file$3, 164, 6, 5412);
    			attr_dev(div4, "class", "modal-card");
    			add_location(div4, file$3, 150, 4, 4742);
    			attr_dev(div5, "class", div5_class_value = /*showCreateModal*/ ctx[2] ? 'modal is-active' : 'modal');
    			add_location(div5, file$3, 148, 0, 4635);
    			attr_dev(div6, "class", "modal-background");
    			add_location(div6, file$3, 173, 4, 5774);
    			attr_dev(p1, "class", "modal-card-title");
    			add_location(p1, file$3, 176, 12, 5889);
    			attr_dev(button3, "class", "delete");
    			attr_dev(button3, "aria-label", "close");
    			add_location(button3, file$3, 177, 12, 5941);
    			attr_dev(header1, "class", "modal-card-head");
    			add_location(header1, file$3, 175, 8, 5844);
    			attr_dev(section1, "class", "modal-card-body");
    			add_location(section1, file$3, 183, 8, 6115);
    			attr_dev(button4, "class", "button is-success");
    			add_location(button4, file$3, 187, 12, 6271);
    			attr_dev(button5, "class", "button");
    			add_location(button5, file$3, 191, 12, 6421);
    			attr_dev(footer1, "class", "modal-card-foot");
    			add_location(footer1, file$3, 186, 8, 6226);
    			attr_dev(div7, "class", "modal-card");
    			add_location(div7, file$3, 174, 4, 5811);
    			attr_dev(div8, "class", div8_class_value = /*showDeleteModal*/ ctx[4] ? "modal is-active" : "modal");
    			add_location(div8, file$3, 172, 0, 5710);
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<LunchMenuAdmin> was created with unknown prop '${key}'`);
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LunchMenuAdmin",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/views/admin/LunchMenuAdminDetails.svelte generated by Svelte v3.46.4 */
    const file$2 = "src/views/admin/LunchMenuAdminDetails.svelte";

    function create_fragment$2(ctx) {
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
    	let t4_value = /*$user*/ ctx[0].schoolName + "";
    	let t4;

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
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$2, 8, 10, 163);
    			add_location(li0, file$2, 7, 8, 148);
    			attr_dev(a1, "href", "/admin/manage-menus");
    			add_location(a1, file$2, 11, 10, 221);
    			add_location(li1, file$2, 10, 8, 206);
    			attr_dev(a2, "href", "/#");
    			add_location(a2, file$2, 14, 10, 336);
    			attr_dev(li2, "class", "is-active");
    			add_location(li2, file$2, 13, 8, 303);
    			add_location(ul, file$2, 6, 6, 135);
    			attr_dev(nav, "class", "breadcrumb");
    			attr_dev(nav, "aria-label", "breadcrumbs");
    			add_location(nav, file$2, 5, 4, 79);
    			add_location(div, file$2, 4, 2, 69);
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
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$user*/ 1 && t4_value !== (t4_value = /*$user*/ ctx[0].schoolName + "")) set_data_dev(t4, t4_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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
    	let $user;
    	validate_store(user, 'user');
    	component_subscribe($$self, user, $$value => $$invalidate(0, $user = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LunchMenuAdminDetails', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LunchMenuAdminDetails> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ user, $user });
    	return [$user];
    }

    class LunchMenuAdminDetails extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LunchMenuAdminDetails",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/views/admin/AdminLayout.svelte generated by Svelte v3.46.4 */
    const file$1 = "src/views/admin/AdminLayout.svelte";

    // (20:4) {#if initialized}
    function create_if_block(ctx) {
    	let route;
    	let current;

    	route = new Route({
    			props: { currentRoute: /*currentRoute*/ ctx[0] },
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
    			destroy_component(route, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(20:4) {#if initialized}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	let if_block = /*initialized*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			add_location(div, file$1, 18, 0, 359);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AdminLayout', slots, []);
    	let { currentRoute } = $$props;
    	let initialized;

    	onMount(() => {
    		user.set({
    			name: "Test User",
    			schoolName: "Test School"
    		});

    		$$invalidate(1, initialized = true);
    	});

    	const writable_props = ['currentRoute'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AdminLayout> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('currentRoute' in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	$$self.$capture_state = () => ({
    		Route,
    		onMount,
    		user,
    		currentRoute,
    		initialized
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentRoute' in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    		if ('initialized' in $$props) $$invalidate(1, initialized = $$props.initialized);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentRoute, initialized];
    }

    class AdminLayout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { currentRoute: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AdminLayout",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*currentRoute*/ ctx[0] === undefined && !('currentRoute' in props)) {
    			console.warn("<AdminLayout> was created without expected prop 'currentRoute'");
    		}
    	}

    	get currentRoute() {
    		throw new Error("<AdminLayout>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentRoute(value) {
    		throw new Error("<AdminLayout>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const routes = [
        { name: '/', component: Home },
        { name: '/lunch-menu', component: LunchMenuView },
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
