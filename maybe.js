"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nothing = void 0;
exports.maybeBind = maybeBind;
exports.maybeWrap = maybeWrap;
exports.nothing = { type: 'nothing' };
function maybeBind(mq, f) {
    if (mq.type === 'nothing') {
        return exports.nothing;
    }
    else {
        return f(mq.val);
    }
}
function maybeWrap(t) {
    return {
        type: 'just',
        val: t
    };
}
