/*! jFetch v@VERSION | @DATE | [@BUNDLE] */
(function (global) {
    "use strict";

    if (typeof global !== "object" || !global) {
        throw new Error("jFetch requires a window");
    }

    if (typeof global.jFetch !== "undefined") {
        throw new Error("jFetch is already defined");
    }

    // @CODE

    global.jFetch = jFetch;

})(typeof window !== "undefined" ? window : this);