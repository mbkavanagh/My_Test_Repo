'use strict';

var jsSdkEnums = require('@convertcom/js-sdk-enums');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var DEFAULT_LOG_LEVEL = jsSdkEnums.LogLevel.TRACE;
/**
 * Provides logging logic
 * @category Modules
 * @constructor
 * @implements {LogManagerInterface}
 */
var LogManager = /** @class */ (function () {
    /**
     * @param {any} client
     * @param {LogLevel=} level
     * @param {LogMethodMapInterface=} mapper
     */
    function LogManager(client, level, mapper) {
        var _a;
        if (client === void 0) { client = console; }
        if (level === void 0) { level = DEFAULT_LOG_LEVEL; }
        this._defaultMapper = (_a = {},
            _a[jsSdkEnums.LogMethod.LOG] = jsSdkEnums.LogMethod.LOG,
            _a[jsSdkEnums.LogMethod.DEBUG] = jsSdkEnums.LogMethod.DEBUG,
            _a[jsSdkEnums.LogMethod.INFO] = jsSdkEnums.LogMethod.INFO,
            _a[jsSdkEnums.LogMethod.WARN] = jsSdkEnums.LogMethod.WARN,
            _a[jsSdkEnums.LogMethod.ERROR] = jsSdkEnums.LogMethod.ERROR,
            _a[jsSdkEnums.LogMethod.TRACE] = jsSdkEnums.LogMethod.TRACE,
            _a);
        this._clients = [];
        this.addClient(client, level, mapper);
    }
    LogManager.prototype._isValidLevel = function (level) {
        return Object.values(jsSdkEnums.LogLevel).includes(level);
    };
    LogManager.prototype._isValidMethod = function (method) {
        return Object.values(jsSdkEnums.LogMethod).includes(method);
    };
    LogManager.prototype._log = function (method, level) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        this._clients.forEach(function (client) {
            if (level >= client.level && jsSdkEnums.LogLevel.SILENT !== level) {
                var fn = client.sdk[client.mapper[method]];
                if (fn) {
                    fn.call.apply(fn, __spreadArray([client.sdk], __read(args), false));
                }
                else {
                    console.log("Info: Unable to find method \"".concat(method, "()\" in client sdk:"), client.sdk.constructor.name);
                    console[method].apply(console, __spreadArray([], __read(args), false));
                }
            }
        });
    };
    /**
     * @param {LogLevel} level
     * @param {Array<any>} args
     */
    LogManager.prototype.log = function (level) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this._isValidLevel(level)) {
            // throw new Error('Invalid Log Level');
            console.error('Invalid Log Level');
            return;
        }
        this._log.apply(this, __spreadArray([jsSdkEnums.LogMethod.LOG, level], __read(args), false));
    };
    /**
     * @param {Array<any>} args
     */
    LogManager.prototype.trace = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log.apply(this, __spreadArray([jsSdkEnums.LogMethod.TRACE, jsSdkEnums.LogLevel.TRACE], __read(args), false));
    };
    /**
     * @param {Array<any>} args
     */
    LogManager.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log.apply(this, __spreadArray([jsSdkEnums.LogMethod.DEBUG, jsSdkEnums.LogLevel.DEBUG], __read(args), false));
    };
    /**
     * @param {Array<any>} args
     */
    LogManager.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log.apply(this, __spreadArray([jsSdkEnums.LogMethod.INFO, jsSdkEnums.LogLevel.INFO], __read(args), false));
    };
    /**
     * @param {Array<any>} args
     */
    LogManager.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log.apply(this, __spreadArray([jsSdkEnums.LogMethod.WARN, jsSdkEnums.LogLevel.WARN], __read(args), false));
    };
    /**
     * @param {Array<any>} args
     */
    LogManager.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log.apply(this, __spreadArray([jsSdkEnums.LogMethod.ERROR, jsSdkEnums.LogLevel.ERROR], __read(args), false));
    };
    /**
     * @param {any=} client
     * @param {LogLevel=} level
     * @param {LogMethodMapInterface=} methodMap
     */
    LogManager.prototype.addClient = function (client, level, methodMap) {
        if (client === void 0) { client = console; }
        if (level === void 0) { level = DEFAULT_LOG_LEVEL; }
        if (!client) {
            // throw new Error('Invalid Client SDK');
            console.error('Invalid Client SDK');
            return;
        }
        if (!this._isValidLevel(level)) {
            // throw new Error('Invalid Log Level');
            console.error('Invalid Log Level');
            return;
        }
        var mapper = __assign({}, this._defaultMapper);
        if (methodMap) {
            Object.keys(methodMap)
                .filter(this._isValidMethod)
                .forEach(function (method) {
                mapper[method] = methodMap[method];
            });
        }
        this._clients.push({ sdk: client, level: level, mapper: mapper });
    };
    /**
     * @param {LogLevel=} level
     * @param {any=} client
     */
    LogManager.prototype.setClientLevel = function (level, client) {
        if (!this._isValidLevel(level)) {
            // throw new Error('Invalid Log Level');
            console.error('Invalid Log Level');
            return;
        }
        if (client) {
            var clientIndex = this._clients.findIndex(function (_a) {
                var sdk = _a.sdk;
                return sdk === client;
            });
            if (clientIndex === -1) {
                console.error('Client SDK not found');
                return;
            }
            this._clients[clientIndex].level = level;
        }
        else {
            for (var i = 0, max = this._clients.length; i < max; i++)
                this._clients[i].level = level;
        }
    };
    return LogManager;
}());

exports.LogManager = LogManager;
//# sourceMappingURL=index.js.map
