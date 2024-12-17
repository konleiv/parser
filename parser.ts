import { Maybe, maybeBind, maybeWrap, nothing } from './maybe';

export type Parser<T> = (s: string) => Maybe<[T, string]>;

export function result<T>(t: T): Parser<T> {
    return (s: string) => {
        return maybeWrap([t,s]);
    }
}

export function zero<T>(): Parser<T> {
    return (s: string) => {
        return nothing;
    }
}

export const digit: Parser<number> = (s: string) => {
    if (s.length === 0) {
        return nothing;
    } else if (Number(s[0])) {
        return maybeWrap([Number(s[0]),s.slice(1)]);
    } else {
        return nothing;
    }
};

export function char(c: string): Parser<string> {
    return (s: string) => {
        if (s.length === 0) {
            return nothing;
        } else if (c === s[0]) {
            return maybeWrap([s[0],s.slice(1)]);
        } else {
            return nothing;
        }
    }
}

export function parserBind<Q,R>(pq: Parser<Q>, f: (q: Q) => Parser<R>): Parser<R> {
    return (s: string) => {
        const r1 = pq(s);
        return maybeBind(r1, (res) => {
            const [v,inp] = res;
            return f(v)(inp);
        })
    }
}

export function or<Q,R>(pq: Parser<Q>, pr: Parser<R>): Parser<Q|R> {
    return (s: string) => {
        const resq = pq(s);
        if (resq.type === 'nothing') {
            return pr(s);
        } else {
            return resq;
        }
    };
}



export function many<T>(p: Parser<T>): Parser<T[]> {
    return parserBind(p, (valp) => {
        const q = many(p);
        return (s: string) => {
            const res = q(s);
            if (res.type === 'nothing') {
                return maybeWrap([[valp],s]);
            } else {
                return maybeBind(res, (valq) => {
                    const [v,inp] = valq;
                    return maybeWrap([[valp].concat(v),inp]);
                })
            }
        }
    })
}

export function text(st: string): Parser<string> {
    if (st.length === 0) {
        return result('');
    } else {
        const p = char(st[0]);
        return parserBind(p, (x) => {
            const q = text(st.slice(1));
            return parserBind(q, (y) => {
                return result(x+y);
            })
        })
    }
}

export const number: Parser<number> = or(parserBind(many(digit), (x) => {
    return parserBind(char('.'), (y) => {
        return parserBind(many(digit), (z) => {
            const [i,j,k] = [x,y,z];
            const a = i.map(String).join('');
            const c = k.map(String).join('');
            return result(Number(a+j+c));
        })
    })
}), parserBind(many(digit), (x) => {
    return result(Number(x.map(String).join('')));
}));

// grammar
// <va>     ::= 'item1' | 'item2'
// <lit>    ::= number
// <op>     ::= '+' | '-' | '*' | '/' | '^'
// <lp>     ::= '('
// <rp>     ::= ')'
// <atom>   ::= <var> | <lit>
// <pexpr>  ::= <lp> <expr> <rp>
// <opexpr> ::= <atom>  <op> <atom>  | 
//              <atom>  <op> <pexpr> |
//              <pexpr> <op> <atom>  |
//              <pexpr> <op> <pexpr> 
// <expr>   ::= <atom> | <pexpr> | <opexpr>

export type Va     = string; // 'item1' | 'item2'
export type Lit    = number;
export type Op     = string; // '+' | '-' | '*' | '/' | '^';
export type Lp     = string; // '(';
export type Rp     = string; // ')';
export type Atom   = { type: 'atom', val: Va | Lit };
export type Pexpr  = { type: 'pexpr', val: [Lp,Expr,Rp] };
export type Opexpr = { 
    type: 'opexpr', 
    val: [Atom,Op,Atom]  |
         [Atom,Op,Pexpr] |
         [Pexpr,Op,Atom] |
         [Pexpr,Op,Pexpr]
};
export type Expr    = Atom | Pexpr | Opexpr;

function logExpr(expr: Expr): string {
    switch(expr.type) {
        case 'atom':
            return logAtom(expr);
        case 'pexpr':
            return logPexpr(expr);
        case 'opexpr':
            return logOpexpr(expr);
    }
}

export function logAtom(atom: Atom): string {
    return String(atom.val);
}

export function logPexpr(pexpr: Pexpr): string {
    return '(' + logExpr(pexpr.val[1]) + ')';
}

function logOpexpr(opexpr: Opexpr): string {
    return logExpr(opexpr.val[0]) + opexpr.val[1] + logExpr(opexpr.val[2]);
}

function chain<A,B,C>(
    pa: Parser<A>,
    pb: Parser<B>,
    pc: Parser<C>
): Parser<[A,B,C]> {
    return parserBind(pa, (x) => {
        return parserBind(pb, (y) => {
            return parserBind(pc, (z) => {
                return result([x,y,z]);
            })
        })
    })
}

export const atomParser: Parser<Atom> =
    parserBind(or(number,
        or(text("item1"), text("item2"))
    ), (x) => {
        console.log('atomParser');
        return result({
            type: 'atom',
            val: x
        })
    });

export const pexprParser: Parser<Pexpr> =
    parserBind(chain(char('('),exprParser,char(')')), (x) => {
        console.log('pexprParser');
        return result({
            type: 'pexpr',
            val: x
        });
    });

const opParser: Parser<Op> =
    or(char('+'),
        or(char('-'),
            or(char('*'),
                or(char('/'), char('^'))
            )
        )
    );

const opexprParser: Parser<Opexpr> =
    parserBind(or(chain(pexprParser,opParser,pexprParser),
        or(chain(pexprParser,opParser,atomParser),
            or(chain(atomParser,opParser,pexprParser), chain(atomParser,opParser,atomParser)))
    ), (x) => {
        return result({
            type: 'opexpr',
            val: x
        });
    });

export function exprParser(s: string): Maybe<[Expr,string]> {
    return or(opexprParser,
        or(pexprParser, atomParser)
    )(s);
}

function validateExpr(s: string) {
    console.log('input:', s);
    maybeBind(exprParser(s), (x) => {
        const [v,rest] = x;
        const l = logExpr(v);
        console.log('parsed:', l);
        if (rest === '') {
            console.log('parsed everything');
            console.log('valid');
        } else {
            console.log('left:', rest);
            console.log('parse error after:', l);
            console.log('invalid');
        }
        return nothing;
    });
    console.log('parsed: nothing');
    console.log('left:', s);
}

// console.log('|=========||=========||=========||=========');
// validateExpr('ite1+3.a14');
// console.log('|=========||=========||=========||=========');
// validateExpr('item1a3.a14');
// console.log('|=========||=========||=========||=========');
// validateExpr('1)');
// console.log('|=========||=========||=========||=========');
// validateExpr('item1(+1');
// console.log('|=========||=========||=========||=========');
// validateExpr('(item1)+(1)');
// console.log('|=========||=========||=========||=========');
// validateExpr('(item1+(1)');
// console.log('|=========||=========||=========||=========');
// validateExpr('(item1+(1))*1');
// console.log('|=========||=========||=========||=========');
// validateExpr('(item1+(1+(item2^(7+itm1))))*1');
// console.log('|=========||=========||=========||=========');
// console.log(opexprParser('(item1+(1+(item2^(7+itm1))))*1'));
// console.log(pexprParser('(item1+(1+(item2^(7+itm1))))'));
// console.log(exprParser('item1+(1+(item2^(7+itm1)))'));
// console.log(pexprParser('(1+(item2^(7+itm1)))'));
// console.log(exprParser('1+(item2^(7+itm1))'));
// console.log(pexprParser('(item2^(7+itm1))'));
// console.log(exprParser('item2^(7+itm1)'));
// console.log(pexprParser('(7+itm1)'));
// console.log(exprParser('7+itm1'));