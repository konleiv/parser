"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digit = void 0;
exports.result = result;
exports.zero = zero;
exports.char = char;
exports.parserBind = parserBind;
exports.or = or;
exports.many = many;
exports.parserMap = parserMap;
exports.text = text;
var maybe_1 = require("./maybe");
function result(t) {
    return function (s) {
        return (0, maybe_1.maybeWrap)([t, s]);
    };
}
function zero() {
    return function (s) {
        return maybe_1.nothing;
    };
}
var digit = function (s) {
    if (s.length === 0) {
        return maybe_1.nothing;
    }
    else if (Number(s[0])) {
        return (0, maybe_1.maybeWrap)([Number(s[0]), s.slice(1)]);
    }
    else {
        return maybe_1.nothing;
    }
};
exports.digit = digit;
function char(c) {
    return function (s) {
        if (s.length === 0) {
            return maybe_1.nothing;
        }
        else if (c === s[0]) {
            return (0, maybe_1.maybeWrap)([s[0], s.slice(1)]);
        }
        else {
            return maybe_1.nothing;
        }
    };
}
function parserBind(pq, f) {
    return function (s) {
        var r1 = pq(s);
        return (0, maybe_1.maybeBind)(r1, function (res) {
            var v = res[0], inp = res[1];
            return f(v)(inp);
        });
    };
}
function or(pq, pr) {
    return function (s) {
        var resq = pq(s);
        if (resq.type === 'nothing') {
            return pr(s);
        }
        else {
            return resq;
        }
    };
}
function many(p) {
    return parserBind(p, function (valp) {
        var q = many(p);
        return function (s) {
            var res = q(s);
            if (res.type === 'nothing') {
                return (0, maybe_1.maybeWrap)([[valp], s]);
            }
            else {
                return (0, maybe_1.maybeBind)(res, function (valq) {
                    var v = valq[0], inp = valq[1];
                    return (0, maybe_1.maybeWrap)([[valp].concat(v), inp]);
                });
            }
        };
    });
}
function parserMap(p, f) {
    return parserBind(p, function (q) {
        return result(f(q));
    });
}
function text(st) {
    if (st.length === 0) {
        return result('');
    }
    else {
        var p = char(st[0]);
        return parserBind(p, function (x) {
            var q = text(st.slice(1));
            return parserBind(q, function (y) {
                return result(x + y);
            });
        });
    }
}
var number = or(parserBind(many(exports.digit), function (x) {
    return parserBind(char('.'), function (y) {
        return parserBind(many(exports.digit), function (z) {
            var _a = [x, y, z], i = _a[0], j = _a[1], k = _a[2];
            var a = i.map(String).join('');
            var c = k.map(String).join('');
            return result(Number(a + j + c));
        });
    });
}), parserBind(many(exports.digit), function (x) {
    return result(Number(x.map(String).join('')));
}));
function logExpr(expr) {
    switch (expr.type) {
        case 'atom':
            return logAtom(expr);
        case 'pexpr':
            return logPexpr(expr);
        case 'opexpr':
            return logOpexpr(expr);
    }
}
function logAtom(atom) {
    return String(atom.val);
}
function logPexpr(pexpr) {
    return '(' + logExpr(pexpr.val[1]) + ')';
}
function logOpexpr(opexpr) {
    return logExpr(opexpr.val[0]) + opexpr.val[1] + logExpr(opexpr.val[2]);
}
function chain(pa, pb, pc) {
    return parserBind(pa, function (x) {
        return parserBind(pb, function (y) {
            return parserBind(pc, function (z) {
                return result([x, y, z]);
            });
        });
    });
}
var atomParser = parserBind(or(number, or(text("item1"), text("item2"))), function (x) {
    return result({
        type: 'atom',
        val: x
    });
});
var pexprParser = parserBind(chain(char('('), exprParser, char(')')), function (x) {
    return result({
        type: 'pexpr',
        val: x
    });
});
var opParser = or(char('+'), or(char('-'), or(char('*'), or(char('/'), char('^')))));
var opexprParser = parserBind(or(chain(pexprParser, opParser, pexprParser), or(chain(pexprParser, opParser, atomParser), or(chain(atomParser, opParser, pexprParser), chain(atomParser, opParser, atomParser)))), function (x) {
    return result({
        type: 'opexpr',
        val: x
    });
});
function exprParser(s) {
    return or(opexprParser, or(pexprParser, atomParser))(s);
}
function validateExpr(s) {
    console.log('input:', s);
    (0, maybe_1.maybeBind)(exprParser(s), function (x) {
        var v = x[0], rest = x[1];
        var l = logExpr(v);
        console.log('parsed:', l);
        if (rest === '') {
            console.log('parsed everything');
            console.log('valid');
        }
        else {
            console.log('left:', rest);
            console.log('parse error after:', l);
            console.log('invalid');
        }
        return maybe_1.nothing;
    });
    console.log('parsed: nothing');
    console.log('left:', s);
}
console.log('|=========||=========||=========||=========');
validateExpr('ite1+3.a14');
console.log('|=========||=========||=========||=========');
validateExpr('item1a3.a14');
console.log('|=========||=========||=========||=========');
validateExpr('1)');
console.log('|=========||=========||=========||=========');
validateExpr('item1(+1');
console.log('|=========||=========||=========||=========');
validateExpr('(item1)+(1)');
console.log('|=========||=========||=========||=========');
validateExpr('(item1+(1)');
console.log('|=========||=========||=========||=========');
validateExpr('(item1+(1))*1');
console.log('|=========||=========||=========||=========');
